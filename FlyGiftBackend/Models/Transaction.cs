using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace FlyGiftBackend.Models
{
    /// <summary>
    /// Append-only ledger entry. Once written, rows MUST NOT be updated or
    /// deleted — corrections happen by writing a compensating entry with
    /// <see cref="ReversesTransactionId"/> set. The auditable balance is
    /// derived by summing rows (see Services.Ledger.BalanceService) so a
    /// tampered <see cref="User.AccountBalance"/> cache cannot mask theft.
    /// </summary>
    public class Transaction
    {
        public int Id { get; set; }

        [ForeignKey("User")]
        public int UserId { get; set; }
        public User User { get; set; }

        public TransactionType Type { get; set; }

        [Column(TypeName = "decimal(18, 2)")]
        public decimal Amount { get; set; }

        public string Currency { get; set; }

        [ForeignKey("RelatedGiftCard")]
        public int? RelatedGiftCardId { get; set; }
        public GiftCard RelatedGiftCard { get; set; }

        /// <summary>
        /// Free-form correlation id linking the entry to a domain object
        /// (e.g. "booking:123", "bulk:&lt;guid&gt;", "giftcard:42",
        /// "invoice:INV-2025-001"). Indexed for fast lookups.
        /// </summary>
        [MaxLength(128)]
        public string? TransactionReference { get; set; }

        /// <summary>
        /// Cached running balance immediately after this entry was applied.
        /// Auditors should re-derive this with BalanceService and detect
        /// drift between the cached value and the true ledger sum.
        /// </summary>
        [Column(TypeName = "decimal(18, 2)")]
        public decimal BalanceAfter { get; set; }

        /// <summary>If true, this row reverses another entry (refund / void).</summary>
        public bool IsReversal { get; set; }

        /// <summary>The id of the entry being reversed (set when IsReversal=true).</summary>
        public int? ReversesTransactionId { get; set; }

        /// <summary>Optional human description.</summary>
        [MaxLength(512)]
        public string? Description { get; set; }

        public DateTime CreatedAt { get; set; }
    }

    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum TransactionType
    {
        Load,
        Spend,
        Refund,
        Adjustment,
    }
}
