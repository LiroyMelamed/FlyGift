using FlyGiftBackend.Services.Flights;

namespace FlyGiftBackend.Services.Booking
{
    public class BookFlightRequest
    {
        public string OfferId { get; set; } = "";

        /// <summary>
        /// Multi-passenger list. New clients must populate this; the
        /// legacy <see cref="PassengerName"/> field is honored as a
        /// fallback when this is empty (1-pax bookings). Length must
        /// match the `passengers` count used at search time, otherwise
        /// the price won't match the offer.
        /// </summary>
        public List<PassengerInfo>? Passengers { get; set; }

        /// <summary>Legacy single-passenger field. Prefer <see cref="Passengers"/>.</summary>
        public string? PassengerName { get; set; }

        /// <summary>Customer email — forwarded to Kiwi for booking notifications.</summary>
        public string? ContactEmail { get; set; }

        /// <summary>Customer phone — forwarded to Kiwi for booking notifications.</summary>
        public string? ContactPhone { get; set; }

        /// <summary>
        /// The price the user has agreed to. On the first attempt this is
        /// the offer's quoted total. If <see cref="check_flights"/> returns
        /// a different total, the controller surfaces a 409 to the UI and
        /// the user is asked to resubmit with this set to the new total.
        /// </summary>
        public decimal? AcceptedPrice { get; set; }
    }

    public class PassengerInfo
    {
        public string FirstName { get; set; } = "";
        public string LastName { get; set; } = "";
        public string? PassportNumber { get; set; }
        public DateTime? PassportExpiry { get; set; }
        public DateTime? BirthDate { get; set; }
        public string FullName => string.IsNullOrWhiteSpace(LastName)
            ? FirstName.Trim()
            : $"{FirstName} {LastName}".Trim();
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
        public string Currency { get; set; } = "ILS";
        public decimal RemainingBalance { get; set; }

        /// <summary>Real upstream booking id (Kiwi numeric / Duffel string).</summary>
        public string? KiwiBookingId { get; set; }
        /// <summary>PNR / record locator returned by the upstream.</summary>
        public string? KiwiPnr { get; set; }
        /// <summary>True when booked against sandbox/test_payments=1.</summary>
        public bool IsTestBooking { get; set; }
    }

    public interface IBookingService
    {
        Task<BookFlightResult> BookFlightAsync(int userId, BookFlightRequest request, CancellationToken ct);
    }
}
