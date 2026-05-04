using FlyGiftBackend.Services.Flights;

namespace FlyGiftBackend.Services.Booking
{
    public class BookFlightRequest
    {
        public string OfferId { get; set; } = "";
        public string PassengerName { get; set; } = "";
        /// <summary>Stripe-style payment method token. Required only if balance is insufficient.</summary>
        public string? PaymentMethodToken { get; set; }
    }

    public class BookFlightResult
    {
        public int BookingId { get; set; }
        public string FlightNumber { get; set; } = "";
        public string Route { get; set; } = "";        // "TLV → JFK"
        public DateTime DepartureUtc { get; set; }
        public string Seat { get; set; } = "";
        public string Gate { get; set; } = "";
        public decimal TotalCharged { get; set; }
        public decimal PaidFromBalance { get; set; }
        public decimal PaidFromCard { get; set; }
        public string Currency { get; set; } = "USD";
        public decimal RemainingBalance { get; set; }
        public string? CardBrand { get; set; }
        public string? CardLast4 { get; set; }
    }

    public interface IBookingService
    {
        Task<BookFlightResult> BookFlightAsync(int userId, BookFlightRequest request, CancellationToken ct);
    }
}
