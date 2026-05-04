using System.ComponentModel.DataAnnotations.Schema;

namespace FlyGiftBackend.Models
{
    public class User
    {
        public int Id { get; set; }

        public string UserName { get; set; }

        public string? Email { get; set; }

        public string PasswordHash { get; set; }

        public string? FirstName { get; set; }

        public string? LastName { get; set; }

        public UserRole Role { get; set; }

        /// <summary>
        /// Spendable cash balance (sum of redeemed gift cards minus
        /// flight/hotel spend). Stored on the user for fast checkout
        /// decisions; the source of truth is the Transactions ledger.
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal AccountBalance { get; set; }

        /// <summary>
        /// Optional verified phone (E.164). Used by the OTP service before
        /// allowing high-value actions like redeeming a gift card.
        /// </summary>
        public string? PhoneNumber { get; set; }

        public bool PhoneVerified { get; set; }

        // Optimistic concurrency on Postgres uses the system `xmin` column,
        // configured via UseXminAsConcurrencyToken() in AppDbContext — no
        // explicit RowVersion property needed.

        public DateTime CreatedAt {  get; set; } 
    }

    public enum UserRole
    {
        Client,
        Company,
        Admin
    }
}
