using System.ComponentModel.DataAnnotations.Schema;

namespace FlyGiftBackend.Models
{
    public class FlightBooking
    {
        public int Id { get; set; }

        [ForeignKey("User")]
        public int UserId { get; set; }
        public User User { get; set; }

        public string FlightDetails { get; set; }  // Consider using JSON if using EF Core 5 or later

        /// <summary>
        /// JSON-serialized BoardingPassData (flight number, gate, seat, QR payload, etc.).
        /// Populated once the booking is ticketed. Null while Pending.
        /// </summary>
        public string? BoardingPassData { get; set; }

        public BookingStatus Status { get; set; }

        public DateTime CreatedAt { get; set; }
    }

    public enum BookingStatus
    {
        Booked,
        Pending,
        Cancelled
    }
}
