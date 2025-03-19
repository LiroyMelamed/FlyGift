using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace FlyGiftBackend.Models
{
    public class Transaction
    {
        public int Id { get; set; }

        [ForeignKey("User")]
        public int UserId { get; set; }
        public User User { get; set; }

        public TransactionType Type { get; set; }

        public decimal Amount { get; set; }

        public string Currency { get; set; }

        [ForeignKey("RelatedGiftCard")]
        public int? RelatedGiftCardId { get; set; }
        public GiftCard RelatedGiftCard { get; set; }

        public DateTime CreatedAt { get; set; }

        public enum TransactionType
        {
            Load,
            Spend
        }
    }

}
