using FlyGiftBackend.Data;
using FlyGiftBackend.Models;
using Microsoft.EntityFrameworkCore;

namespace FlyGiftBackend.Services.Ledger
{
    /// <summary>
    /// Ledger contract — all balance reads + writes MUST go through here.
    /// Direct mutations of <see cref="User.AccountBalance"/> are reserved
    /// for migrations / admin reconciliation only.
    /// </summary>
    public interface IBalanceService
    {
        /// <summary>Authoritative balance derived by summing the ledger.</summary>
        Task<decimal> GetBalanceAsync(int userId, CancellationToken ct = default);

        /// <summary>True iff the cached <c>User.AccountBalance</c> matches the ledger.</summary>
        Task<bool> VerifyConsistencyAsync(int userId, CancellationToken ct = default);

        /// <summary>
        /// Append an entry to the ledger and return it (with BalanceAfter
        /// populated). Caller MUST be inside an existing DB transaction.
        /// </summary>
        Task<Transaction> PostAsync(LedgerEntry entry, CancellationToken ct = default);
    }

    /// <summary>Input record for a new ledger post.</summary>
    public class LedgerEntry
    {
        public int UserId { get; set; }
        public TransactionType Type { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "USD";
        public int? RelatedGiftCardId { get; set; }
        public string? Reference { get; set; }
        public string? Description { get; set; }
        public bool IsReversal { get; set; }
        public int? ReversesTransactionId { get; set; }
    }

    public class BalanceService : IBalanceService
    {
        private readonly AppDbContext _db;
        private readonly ILogger<BalanceService> _log;

        public BalanceService(AppDbContext db, ILogger<BalanceService> log)
        {
            _db = db;
            _log = log;
        }

        public async Task<decimal> GetBalanceAsync(int userId, CancellationToken ct = default)
        {
            // Sum positives (Load/Refund) and subtract negatives (Spend/Adjustment-).
            // We keep `Amount` non-negative everywhere; sign is implied by Type.
            var rows = await _db.Transactions
                .AsNoTracking()
                .Where(t => t.UserId == userId)
                .Select(t => new { t.Type, t.Amount, t.IsReversal })
                .ToListAsync(ct);

            decimal balance = 0m;
            foreach (var r in rows)
            {
                var sign = SignFor(r.Type);
                if (r.IsReversal) sign = -sign;
                balance += sign * r.Amount;
            }
            return balance;
        }

        public async Task<bool> VerifyConsistencyAsync(int userId, CancellationToken ct = default)
        {
            var ledger = await GetBalanceAsync(userId, ct);
            var cached = await _db.Users
                .AsNoTracking()
                .Where(u => u.Id == userId)
                .Select(u => (decimal?)u.AccountBalance)
                .FirstOrDefaultAsync(ct) ?? 0m;

            if (ledger != cached)
            {
                _log.LogWarning(
                    "Ledger drift for user {UserId}: cached={Cached} ledger={Ledger}",
                    userId, cached, ledger);
                return false;
            }
            return true;
        }

        public async Task<Transaction> PostAsync(LedgerEntry entry, CancellationToken ct = default)
        {
            if (entry.Amount < 0)
                throw new InvalidOperationException("LedgerEntry.Amount must be non-negative; sign is derived from Type.");

            var current = await GetBalanceAsync(entry.UserId, ct);
            var sign = SignFor(entry.Type);
            if (entry.IsReversal) sign = -sign;
            var after = current + sign * entry.Amount;

            var row = new Transaction
            {
                UserId = entry.UserId,
                Type = entry.Type,
                Amount = entry.Amount,
                Currency = entry.Currency,
                RelatedGiftCardId = entry.RelatedGiftCardId,
                TransactionReference = entry.Reference,
                Description = entry.Description,
                IsReversal = entry.IsReversal,
                ReversesTransactionId = entry.ReversesTransactionId,
                BalanceAfter = after,
                CreatedAt = DateTime.UtcNow,
            };
            _db.Transactions.Add(row);
            await _db.SaveChangesAsync(ct);
            return row;
        }

        /// <summary>+1 for credits to the user, -1 for debits.</summary>
        public static int SignFor(TransactionType t) => t switch
        {
            // For a CLIENT, redeeming a card (Load) credits balance, paying a
            // flight (Spend) debits it. For a COMPANY sending a card, Load
            // models the obligation (treated as +amount issued; finance
            // teams reconcile via BulkOrder/invoice). Adjustment is signed
            // by IsReversal: positive = credit, IsReversal=true = debit.
            TransactionType.Load       => +1,
            TransactionType.Refund     => +1,
            TransactionType.Adjustment => +1,
            TransactionType.Spend      => -1,
            _ => +1,
        };
    }
}
