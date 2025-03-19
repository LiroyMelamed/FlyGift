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

        [ForeignKey("Recipient")]
        public int RecipientId { get; set; }
        public User Recipient { get; set; }

        public decimal Amount { get; set; }

        public string Currency { get; set; }

        public DateTime ExpirationDate { get; set; }

        public GiftCardStatus Status { get; set; }

        public DateTime CreatedAt { get; set; }
    }

    public enum GiftCardStatus
    {
        Active,
        Redeemed,
        Expired
    }
}
