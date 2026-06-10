using FlyGiftBackend.Data;
using FlyGiftBackend.Models;
using FlyGiftBackend.Services.Billing;
using FlyGiftBackend.Services.Ledger;
using FlyGiftBackend.Services.Notifications;
using Microsoft.EntityFrameworkCore;

namespace FlyGiftBackend.Services.Bulk
{
    /// <summary>
    /// Atomic batch creation: parses an Excel, persists N gift cards
    /// + N matching Load transactions, and enqueues notifications.
    /// </summary>
    public interface IBulkGiftCardService
    {
        Task<BulkParseResult> PreviewAsync(Stream xlsxStream, CancellationToken ct = default);
        Task<BulkDispatchResult> ConfirmAsync(int companyUserId, BulkParseResult parsed, BulkConfirmRequest req, CancellationToken ct = default);
    }

    public class BulkGiftCardService : IBulkGiftCardService
    {
        private readonly AppDbContext _db;
        private readonly IBulkExcelParser _parser;
        private readonly IBulkDispatchQueue _queue;
        private readonly IBalanceService _balance;
        private readonly IInvoiceProvider _invoices;
        private readonly INotificationStore _notify;
        private readonly ILogger<BulkGiftCardService> _log;

        public BulkGiftCardService(
            AppDbContext db,
            IBulkExcelParser parser,
            IBulkDispatchQueue queue,
            IBalanceService balance,
            IInvoiceProvider invoices,
            INotificationStore notify,
            ILogger<BulkGiftCardService> log)
        {
            _db = db;
            _parser = parser;
            _queue = queue;
            _balance = balance;
            _invoices = invoices;
            _notify = notify;
            _log = log;
        }

        public Task<BulkParseResult> PreviewAsync(Stream xlsxStream, CancellationToken ct = default)
            => _parser.ParseAsync(xlsxStream, ct);

        public async Task<BulkDispatchResult> ConfirmAsync(
            int companyUserId,
            BulkParseResult parsed,
            BulkConfirmRequest req,
            CancellationToken ct = default)
        {
            var batchId = Guid.NewGuid();
            var validRows = parsed.Rows.Where(r => r.IsValid).ToList();

            if (validRows.Count == 0)
                return new BulkDispatchResult { BatchId = batchId, TotalRows = 0 };

            var expiry = req.ExpirationDate ?? DateTime.UtcNow.AddYears(1);
            if (expiry <= DateTime.UtcNow)
                throw new InvalidOperationException("תאריך התפוגה חייב להיות עתידי.");

            // ----- Funding check -----
            // Bulk dispatch debits the company wallet by the total of all
            // valid rows. Companies top up via POST /api/Company/Billing/Deposit
            // (Load) before dispatching. Pre-fix this used Type=Load (credit)
            // which printed money — fixed below to Type=Spend.
            var totalRequired = validRows.Sum(r => r.Amount);
            var ledgerBalance = await _balance.GetBalanceAsync(companyUserId, ct);
            if (ledgerBalance < totalRequired)
                throw new InvalidOperationException(
                    $"יתרה לא מספקת. ביתרת החברה יש {ledgerBalance:0.00} {req.DefaultCurrency}, " +
                    $"אך נדרשים {totalRequired:0.00} {req.DefaultCurrency} לאצווה. " +
                    $"בצעו טעינת יתרה לפני המשך.");

            // ----- Phase 1: transactional unit (gift cards + ledger + BulkOrder header).
            // Wrapped in the execution strategy so EnableRetryOnFailure can replay the
            // whole unit as a single retriable batch — required by Npgsql when manual
            // BeginTransactionAsync is in play.
            var strategy = _db.Database.CreateExecutionStrategy();
            var (order, dispatchJob, result, company) =
                await strategy.ExecuteAsync(async () =>
            {
                await using var tx = await _db.Database.BeginTransactionAsync(ct);

                // Resolve / create recipient User stubs by email so each card has a RecipientId.
                var emails = validRows.Select(r => r.Email).Distinct().ToList();
                var existing = await _db.Users
                    .Where(u => u.Email != null && emails.Contains(u.Email))
                    .ToDictionaryAsync(u => u.Email!, ct);

                var newStubs = new List<User>();
                foreach (var email in emails.Where(e => !existing.ContainsKey(e)))
                {
                    var sample = validRows.First(r => r.Email == email);
                    newStubs.Add(new User
                    {
                        UserName = email,
                        Email = email,
                        FirstName = sample.Name,
                        Role = UserRole.Client,
                        PasswordHash = "", // stub — real password set on first claim
                        CreatedAt = DateTime.UtcNow,
                    });
                }
                if (newStubs.Count > 0)
                {
                    _db.Users.AddRange(newStubs);
                    await _db.SaveChangesAsync(ct);
                    foreach (var u in newStubs) existing[u.Email!] = u;
                }

                var dispatchJobLocal = new BulkDispatchJob
                {
                    BatchId = batchId,
                    CompanyUserId = companyUserId,
                };

                var resultLocal = new BulkDispatchResult { BatchId = batchId, TotalRows = validRows.Count };

                try
                {
                    foreach (var row in validRows)
                    {
                        ct.ThrowIfCancellationRequested();
                        var recipient = existing[row.Email];

                        var card = new GiftCard
                        {
                            SenderId = companyUserId,
                            RecipientId = recipient.Id,
                            RecipientEmail = row.Email,
                            RecipientName = row.Name,
                            Amount = row.Amount,
                            Currency = req.DefaultCurrency,
                            ExpirationDate = expiry,
                            Status = GiftCardStatus.Active,
                            // Required by the unique index added in Slice 2;
                            // bulk-created cards need their own ShortCode so
                            // they don't all collide on the empty default.
                            ShortCode = await GenerateUniqueShortCodeAsync(ct),
                            CreatedAt = DateTime.UtcNow,
                        };
                        _db.GiftCards.Add(card);
                        await _db.SaveChangesAsync(ct); // need Id for Transaction.RelatedGiftCardId

                        // Spend = debit the company wallet. Recipients get
                        // credit (Load) on redemption, not on dispatch.
                        await _balance.PostAsync(new LedgerEntry
                        {
                            UserId = companyUserId,
                            Type = TransactionType.Spend,
                            Amount = row.Amount,
                            Currency = req.DefaultCurrency,
                            RelatedGiftCardId = card.Id,
                            Reference = $"bulk:{batchId}",
                            Description = $"Bulk gift to {row.Email}",
                        }, ct);

                        resultLocal.Rows.Add(new BulkDispatchRow
                        {
                            RowNumber = row.RowNumber,
                            Email = row.Email,
                            Success = true,
                            GiftCardId = card.Id,
                        });
                        resultLocal.TotalCharged += row.Amount;

                        dispatchJobLocal.Items.Add(new BulkDispatchJobItem
                        {
                            GiftCardId = card.Id,
                            RecipientName = row.Name,
                            Email = row.Email,
                            Phone = row.Phone,
                            Code = $"FG-{card.Id:D6}",
                            Amount = row.Amount,
                            Currency = req.DefaultCurrency,
                        });
                    }

                    await _db.SaveChangesAsync(ct);

                    var companyLocal = await _db.Users.AsNoTracking()
                        .Where(u => u.Id == companyUserId)
                        .Select(u => new CompanyContact(u.Email, u.FirstName, u.UserName))
                        .FirstOrDefaultAsync(ct);

                    resultLocal.SucceededRows = resultLocal.Rows.Count(r => r.Success);
                    resultLocal.FailedRows = resultLocal.TotalRows - resultLocal.SucceededRows;

                    var orderLocal = new BulkOrder
                    {
                        BatchId = batchId,
                        CompanyUserId = companyUserId,
                        RecipientCount = resultLocal.SucceededRows,
                        TotalCharged = resultLocal.TotalCharged,
                        Currency = req.DefaultCurrency,
                        Status = BulkOrderStatus.Pending,
                        CreatedAt = DateTime.UtcNow,
                    };
                    _db.BulkOrders.Add(orderLocal);
                    await _db.SaveChangesAsync(ct);

                    await tx.CommitAsync(ct);

                    return (orderLocal, dispatchJobLocal, resultLocal, companyLocal);
                }
                catch
                {
                    await tx.RollbackAsync(ct);
                    throw;
                }
            });

            // ----- Phase 2: post-commit best-effort work. Out of the strategy
            // because the gift cards are already issued — we do NOT want a
            // transient failure here to retry the whole insertion above. Each
            // sub-operation handles its own failure independently.
            try
            {
                var invoice = await _invoices.GenerateAsync(new InvoiceRequest
                {
                    CompanyUserId = companyUserId,
                    CompanyName = company?.FirstName ?? company?.UserName ?? "Company",
                    CompanyEmail = company?.Email,
                    Currency = req.DefaultCurrency,
                    ExternalReference = $"bulk:{batchId}",
                    Lines = new List<InvoiceLine>
                    {
                        new()
                        {
                            Description = $"FlyGift bulk distribution — {result.SucceededRows} cards",
                            Quantity = result.SucceededRows,
                            UnitAmount = result.SucceededRows == 0 ? 0m : result.TotalCharged / result.SucceededRows,
                        },
                    },
                }, ct);

                if (invoice.Success)
                {
                    order.InvoiceNumber = invoice.InvoiceNumber;
                    order.InvoiceUrl = invoice.Url;
                    order.InvoicedAt = invoice.IssuedAt;
                    order.Status = BulkOrderStatus.Invoiced;
                }
                else
                {
                    order.Status = BulkOrderStatus.Failed;
                    _log.LogWarning("Invoice generation failed for batch {BatchId}: {Reason}", batchId, invoice.FailureReason);
                }
                _db.BulkOrders.Update(order);
                await _db.SaveChangesAsync(ct);
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "Invoice generation threw for batch {BatchId}", batchId);
                order.Status = BulkOrderStatus.Failed;
                _db.BulkOrders.Update(order);
                await _db.SaveChangesAsync(ct);
            }

            // Fire-and-forget dispatch
            await _queue.EnqueueAsync(dispatchJob, ct);

            await _notify.CreateAsync(
                companyUserId,
                "bulk.dispatched",
                "אצוות מתנות נשלחה",
                $"{result.SucceededRows} מתוך {result.TotalRows} כרטיסים נשלחו · סך {result.TotalCharged:0.00} {req.DefaultCurrency}",
                "/company/dashboard?tab=billing",
                ct);

            _log.LogInformation(
                "Bulk batch {BatchId} committed: {Count} cards, total {Total}",
                batchId, result.SucceededRows, result.TotalCharged);

            return result;
        }

        private record CompanyContact(string? Email, string? FirstName, string? UserName);

        // Mirrors GiftCardController.GenerateUniqueShortCodeAsync. 32^8
        // keyspace; collisions are rare. Retry up to 5 times before giving up.
        private async Task<string> GenerateUniqueShortCodeAsync(CancellationToken ct)
        {
            const string alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/1/I/O
            using var rng = System.Security.Cryptography.RandomNumberGenerator.Create();
            var buf = new byte[8];
            for (var attempt = 0; attempt < 5; attempt++)
            {
                rng.GetBytes(buf);
                var chars = new char[8];
                for (var i = 0; i < 8; i++) chars[i] = alpha[buf[i] % alpha.Length];
                var code = $"FG-{new string(chars, 0, 4)}-{new string(chars, 4, 4)}";
                if (!await _db.GiftCards.AnyAsync(g => g.ShortCode == code, ct))
                    return code;
            }
            throw new InvalidOperationException(
                "Failed to generate unique gift card ShortCode after 5 attempts.");
        }
    }
}
