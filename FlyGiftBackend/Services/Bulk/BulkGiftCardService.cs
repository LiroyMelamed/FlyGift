using FlyGiftBackend.Data;
using FlyGiftBackend.Models;
using FlyGiftBackend.Services.Billing;
using FlyGiftBackend.Services.Ledger;
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
        private readonly ILogger<BulkGiftCardService> _log;

        public BulkGiftCardService(
            AppDbContext db,
            IBulkExcelParser parser,
            IBulkDispatchQueue queue,
            IBalanceService balance,
            IInvoiceProvider invoices,
            ILogger<BulkGiftCardService> log)
        {
            _db = db;
            _parser = parser;
            _queue = queue;
            _balance = balance;
            _invoices = invoices;
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
                throw new InvalidOperationException("ExpirationDate must be in the future.");

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

            var dispatchJob = new BulkDispatchJob
            {
                BatchId = batchId,
                CompanyUserId = companyUserId,
            };

            var result = new BulkDispatchResult { BatchId = batchId, TotalRows = validRows.Count };

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
                        Amount = row.Amount,
                        Currency = req.DefaultCurrency,
                        ExpirationDate = expiry,
                        Status = GiftCardStatus.Active,
                        CreatedAt = DateTime.UtcNow,
                    };
                    _db.GiftCards.Add(card);
                    await _db.SaveChangesAsync(ct); // need Id for Transaction.RelatedGiftCardId

                    await _balance.PostAsync(new LedgerEntry
                    {
                        UserId = companyUserId,
                        Type = TransactionType.Load,
                        Amount = row.Amount,
                        Currency = req.DefaultCurrency,
                        RelatedGiftCardId = card.Id,
                        Reference = $"bulk:{batchId}",
                        Description = $"Bulk gift to {row.Email}",
                    }, ct);

                    result.Rows.Add(new BulkDispatchRow
                    {
                        RowNumber = row.RowNumber,
                        Email = row.Email,
                        Success = true,
                        GiftCardId = card.Id,
                    });
                    result.TotalCharged += row.Amount;

                    dispatchJob.Items.Add(new BulkDispatchJobItem
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

                // Persist the BulkOrder header so company-side billing can
                // attach an invoice asynchronously (Stage 17).
                var company = await _db.Users.AsNoTracking()
                    .Where(u => u.Id == companyUserId)
                    .Select(u => new { u.Email, u.FirstName, u.UserName })
                    .FirstOrDefaultAsync(ct);

                var order = new BulkOrder
                {
                    BatchId = batchId,
                    CompanyUserId = companyUserId,
                    RecipientCount = result.SucceededRows,
                    TotalCharged = result.TotalCharged,
                    Currency = req.DefaultCurrency,
                    Status = BulkOrderStatus.Pending,
                    CreatedAt = DateTime.UtcNow,
                };
                _db.BulkOrders.Add(order);
                await _db.SaveChangesAsync(ct);

                await tx.CommitAsync(ct);

                result.SucceededRows = result.Rows.Count(r => r.Success);
                result.FailedRows = result.TotalRows - result.SucceededRows;

                // Generate invoice OUTSIDE the transaction so a slow billing
                // provider can't roll back the gift cards. Failures here only
                // mark the BulkOrder as Failed for retry.
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

                _log.LogInformation(
                    "Bulk batch {BatchId} committed: {Count} cards, total {Total}",
                    batchId, result.SucceededRows, result.TotalCharged);

                return result;
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        }
    }
}
