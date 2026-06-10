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

        /// <summary>
        /// Upstream provider's booking id (Kiwi numeric, Duffel string, …).
        /// Persisted only after a successful confirm_payment so the row is
        /// the source of truth for "this trip exists at the GDS." Null
        /// while pending or for legacy rows created before the real
        /// Booking API integration landed.
        /// </summary>
        public string? KiwiBookingId { get; set; }

        /// <summary>
        /// PNR / record locator returned by save_booking. Surfaced to the
        /// user on their trip page so they can manage the booking with the
        /// airline directly (web check-in, seat selection, …).
        /// </summary>
        public string? KiwiPnr { get; set; }
    }

    public enum BookingStatus
    {
        Booked,
        Pending,
        Cancelled,
        /// <summary>
        /// Booking simulated against the Kiwi sandbox endpoint
        /// (<c>test_payments=1</c>). Persisted to Neon so test-mode
        /// activity is visible end-to-end, but must never be settled
        /// against real funds.
        /// </summary>
        TestConfirmed,
        /// <summary>
        /// Booking accepted by Kiwi but the Booking API leg is incomplete
        /// (e.g. Booking API access is gated for the partner). A back-office
        /// operator must reconcile via the Tequila portal before the trip.
        /// </summary>
        PendingManualVerify,
        /// <summary>
        /// Live Kiwi booking — <c>save_booking</c> + <c>confirm_payment</c>
        /// both returned status 0, the partner deposit account was charged,
        /// and the wallet ledger has been debited. This is the terminal
        /// success state for production bookings.
        /// </summary>
        Confirmed,
    }
}
