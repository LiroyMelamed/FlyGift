using System.ComponentModel.DataAnnotations.Schema;

namespace FlyGiftBackend.Models
{
    public class HotelBooking
    {
        public int Id { get; set; }

        [ForeignKey("User")]
        public int UserId { get; set; }
        public User User { get; set; }

        public string HotelDetails { get; set; }  // Consider using JSON if using EF Core 5 or later

        public BookingStatus Status { get; set; }

        public DateTime CreatedAt { get; set; }

        public enum BookingStatus
        {
            Booked,
            Pending,
            Cancelled
        }
    }
}
