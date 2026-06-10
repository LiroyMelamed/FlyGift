using System.Text.Json.Serialization;

namespace FlyGiftBackend.Services.Flights
{
    /// <summary>
    /// Shape mirrors Duffel's <c>/air/offers</c> response so we can swap
    /// MockFlightSearchProvider for DuffelFlightSearchProvider without
    /// touching the controller, frontend, or booking service.
    /// </summary>
    public class FlightSearchRequest
    {
        public string Origin { get; set; } = "";       // IATA, e.g. "TLV"
        public string Destination { get; set; } = "";  // IATA, e.g. "JFK"
        public DateTime DepartureDate { get; set; }
        public DateTime? ReturnDate { get; set; }
        public int Passengers { get; set; } = 1;
        public CabinClass Cabin { get; set; } = CabinClass.Economy;
    }

    // Frontend sends string values ("Economy", "Business", …); the
    // default enum binder only accepts integers, which produces a
    // confusing 400 ("could not be converted to CabinClass"). The
    // converter accepts both names *and* numbers, case-insensitively.
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum CabinClass { Economy, PremiumEconomy, Business, First }

    public class FlightSearchResponse
    {
        public string SearchId { get; set; } = "";
        public DateTime GeneratedAt { get; set; }
        public List<FlightOffer> Offers { get; set; } = new();
    }

    public class FlightOffer
    {
        /// <summary>Opaque offer token. Frontend round-trips this to /BookFlight.</summary>
        public string Id { get; set; } = "";
        public string Source { get; set; } = "FlyGift Mock"; // Duffel|Amadeus|Mock
        public CarrierInfo Carrier { get; set; } = new();
        public List<FlightSlice> Slices { get; set; } = new();
        public PriceDetails Price { get; set; } = new();
        public int TotalDurationMinutes { get; set; }
        public int Stops { get; set; }
        public bool IsBestPrice { get; set; }
        public string? BestPriceReason { get; set; } // e.g. "12% below market"
        public DateTime ExpiresAt { get; set; }
        /// <summary>
        /// Provider-side handoff token (Kiwi Tequila <c>booking_token</c>,
        /// Duffel offer id, …). Required by Tequila's Booking API for the
        /// check_flights / save_booking / confirm_payment chain. Server-only —
        /// never leaks to the frontend (filtered by the controller mapper).
        /// </summary>
        [JsonIgnore]
        public string? ProviderToken { get; set; }
    }

    public class CarrierInfo
    {
        public string Iata { get; set; } = "";
        public string Name { get; set; } = "";
        public string LogoUrl { get; set; } = "";
    }

    public class FlightSlice
    {
        public Place Origin { get; set; } = new();
        public Place Destination { get; set; } = new();
        public DateTime DepartureUtc { get; set; }
        public DateTime ArrivalUtc { get; set; }
        public int DurationMinutes { get; set; }
        public List<FlightSegment> Segments { get; set; } = new();
    }

    public class FlightSegment
    {
        public string FlightNumber { get; set; } = "";
        public CarrierInfo MarketingCarrier { get; set; } = new();
        public Place Origin { get; set; } = new();
        public Place Destination { get; set; } = new();
        public DateTime DepartureUtc { get; set; }
        public DateTime ArrivalUtc { get; set; }
        public string Aircraft { get; set; } = "";
    }

    public class Place
    {
        public string Iata { get; set; } = "";
        public string Name { get; set; } = "";
        public string City { get; set; } = "";
        public string Country { get; set; } = "";
        public string? Terminal { get; set; }
    }

    public class PriceDetails
    {
        public decimal Total { get; set; }
        public decimal Base { get; set; }
        public decimal Taxes { get; set; }
        public string Currency { get; set; } = "ILS";
        /// <summary>Median across competitor providers (mock for now).</summary>
        public decimal MarketMedian { get; set; }
    }

    public class Airport
    {
        public string Iata { get; set; } = "";
        public string Name { get; set; } = "";
        public string City { get; set; } = "";
        public string Country { get; set; } = "";
    }
}
