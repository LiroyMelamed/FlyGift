using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FlyGiftBackend.Models
{
    /// <summary>
    /// Per-user activity feed item. Created by services on key events
    /// (gift redeemed, flight booked, batch dispatched, …) and rendered
    /// in the topbar bell. Read/unread is the only mutable state.
    /// </summary>
    public class Notification
    {
        public int Id { get; set; }

        [ForeignKey("User")]
        public int UserId { get; set; }
        public User? User { get; set; }

        [Required]
        [MaxLength(64)]
        public string Type { get; set; } = "";

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = "";

        [MaxLength(500)]
        public string? Body { get; set; }

        /// <summary>Optional deep-link the bell row navigates to.</summary>
        [MaxLength(500)]
        public string? Href { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime? ReadAt { get; set; }
    }
}
