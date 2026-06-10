namespace FlyGiftBackend.Services.Hotels
{
    /// <summary>
    /// Shape mirrors the RapidAPI Booking.com <c>/hotels/search</c> response so
    /// we can swap MockHotelSearchProvider for a real provider without touching
    /// the controller or frontend.
    /// </summary>
    public class HotelSearchRequest
    {
        public string City { get; set; } = "";        // "Tel Aviv", "Paris", etc.
        public DateTime CheckIn { get; set; }
        public DateTime CheckOut { get; set; }
        public int Guests { get; set; } = 2;
        /// <summary>
        /// Optional hard cap for results filtered by the user's wallet
        /// balance. When 0/null the service still returns everything but
        /// flags Affordability per row so the UI can dim or split-pay.
        /// </summary>
        public decimal? MaxNightlyRate { get; set; }
    }

    public class HotelSearchResponse
    {
        public string SearchId { get; set; } = "";
        public DateTime GeneratedAt { get; set; }
        public int Nights { get; set; }
        public string City { get; set; } = "";
        public decimal AccountBalance { get; set; }
        public string Currency { get; set; } = "ILS";
        public List<HotelOffer> Offers { get; set; } = new();
    }

    public class HotelOffer
    {
        public string Id { get; set; } = "";
        public string Name { get; set; } = "";
        public string City { get; set; } = "";
        public string Country { get; set; } = "";
        public string ImageUrl { get; set; } = "";
        public double Rating { get; set; }
        public int ReviewCount { get; set; }
        public List<string> Amenities { get; set; } = new();
        public decimal NightlyRate { get; set; }
        public decimal TotalPrice { get; set; }
        public string Currency { get; set; } = "ILS";
        public bool AffordableFromBalance { get; set; }
        public decimal CardTopUpRequired { get; set; }
    }

    public class BookHotelRequest
    {
        public string OfferId { get; set; } = "";
        public string GuestName { get; set; } = "";
    }

    public class BookHotelResult
    {
        public int BookingId { get; set; }
        public string Reference { get; set; } = "";
        public string HotelName { get; set; } = "";
        public string City { get; set; } = "";
        public DateTime CheckIn { get; set; }
        public DateTime CheckOut { get; set; }
        public int Nights { get; set; }
        public decimal TotalCharged { get; set; }
        public decimal PaidFromBalance { get; set; }
        public decimal PaidFromCard { get; set; }
        public decimal RemainingBalance { get; set; }
        public string Currency { get; set; } = "ILS";
    }
}
