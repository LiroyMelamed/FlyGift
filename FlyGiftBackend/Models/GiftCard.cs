using Microsoft.EntityFrameworkCore.Metadata.Internal;
using System;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using System.Reflection.Metadata;

namespace FlyGiftBackend.Models
{
    public class GiftCard
    {
        public int Id { get; set; }

        [ForeignKey("Sender")]
        public int SenderId { get; set; }
        public User Sender { get; set; }

        // Nullable now: the recipient may be an external party (identified
        // only by email) when the gift is purchased. Once they sign up
        // and claim the gift, RecipientId is populated.
        [ForeignKey("Recipient")]
        public int? RecipientId { get; set; }
        public User? Recipient { get; set; }

        // External recipient contact captured at purchase time. Required
        // on the wire when RecipientId isn't supplied (validated in
        // GiftCardController.Purchase, not at the DB layer).
        [MaxLength(256)]
        public string? RecipientEmail { get; set; }

        [MaxLength(200)]
        public string? RecipientName { get; set; }

        public decimal Amount { get; set; }

        public string Currency { get; set; }

        public DateTime ExpirationDate { get; set; }

        public GiftCardStatus Status { get; set; }

        // Public-facing share token. The `/gifts/{code}` recipient page
        // looks the card up by this value, so it doubles as a bearer
        // credential — keep it unguessable and unique.
        [Required]
        [MaxLength(32)]
        public string ShortCode { get; set; } = string.Empty;

        // Frozen flight intent at purchase time (airline, destination,
        // dates, etc.). Stored as JSON so the recipient sees the gift's
        // original intent even if live availability changes.
        public string? FlightSnapshot { get; set; }

        // Optimistic concurrency via Postgres `xmin` (see AppDbContext).

        public DateTime CreatedAt { get; set; }
    }

    public enum GiftCardStatus
    {
        Active,
        Redeemed,
        Expired
    }
}
