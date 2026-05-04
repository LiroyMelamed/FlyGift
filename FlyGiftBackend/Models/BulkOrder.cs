using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FlyGiftBackend.Models
{
    /// <summary>
    /// Aggregate record of a B2B bulk-purchase batch. One row is created
    /// per <c>POST /api/Company/BulkUpload/Confirm</c> call and references
    /// the resulting GiftCards via <see cref="BatchId"/>.
    /// </summary>
    public class BulkOrder
    {
        public int Id { get; set; }

        /// <summary>Stable id surfaced to the client + invoice line items.</summary>
        public Guid BatchId { get; set; }

        [ForeignKey("Company")]
        public int CompanyUserId { get; set; }
        public User Company { get; set; }

        public int RecipientCount { get; set; }

        [Column(TypeName = "decimal(18, 2)")]
        public decimal TotalCharged { get; set; }

        [MaxLength(8)]
        public string Currency { get; set; } = "USD";

        /// <summary>External invoice id (e.g. "INV-2026-0042").</summary>
        [MaxLength(64)]
        public string? InvoiceNumber { get; set; }

        /// <summary>URL to the generated PDF. Empty until invoice provider returns.</summary>
        [MaxLength(2048)]
        public string? InvoiceUrl { get; set; }

        public BulkOrderStatus Status { get; set; } = BulkOrderStatus.Pending;

        public DateTime CreatedAt { get; set; }
        public DateTime? InvoicedAt { get; set; }
    }

    public enum BulkOrderStatus
    {
        Pending,
        Invoiced,
        Failed,
    }
}
