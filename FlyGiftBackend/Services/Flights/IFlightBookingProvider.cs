namespace FlyGiftBackend.Services.Flights
{
    /// <summary>
    /// Provider-neutral order-creation contract. Decouples the
    /// orchestration in <see cref="Booking.BookingService"/> from the
    /// upstream GDS so we can swap Kiwi → Duffel/Amadeus without touching
    /// the booking pipeline.
    /// </summary>
    public interface IFlightBookingProvider
    {
        string ProviderName { get; }

        /// <summary>
        /// Verifies price & availability, then creates and confirms the
        /// order. Implementations are responsible for the full multi-call
        /// chain; the orchestrator only invokes this once per booking
        /// attempt and reads <see cref="BookOrderResult"/> for the real
        /// upstream booking id and PNR.
        /// </summary>
        Task<BookOrderResult> BookAsync(BookOrderRequest request, CancellationToken ct);
    }

    public sealed class BookOrderRequest
    {
        public FlightOffer Offer { get; set; } = new();
        public List<Booking.PassengerInfo> Passengers { get; set; } = new();
        /// <summary>Customer email for Kiwi notifications.</summary>
        public string? ContactEmail { get; set; }
        /// <summary>Customer phone for Kiwi notifications.</summary>
        public string? ContactPhone { get; set; }
        /// <summary>
        /// Original price the user agreed to. If a fresh check_flights
        /// returns a different total, the provider throws
        /// <see cref="PriceChangedException"/> instead of silently charging
        /// the new amount, unless the caller resubmits with this set to
        /// the new total.
        /// </summary>
        public decimal AgreedPrice { get; set; }
    }

    public sealed class BookOrderResult
    {
        /// <summary>Upstream booking id (Kiwi numeric, Duffel string, …).</summary>
        public string ProviderBookingId { get; set; } = "";
        /// <summary>PNR / record locator if the provider issued one.</summary>
        public string? Pnr { get; set; }
        /// <summary>Final price the provider actually charged (post check_flights).</summary>
        public decimal FinalPrice { get; set; }
        public string Currency { get; set; } = "ILS";
        /// <summary>True if booked against a sandbox / test_payments=1 path.</summary>
        public bool IsTest { get; set; }
    }

    /// <summary>
    /// Thrown when the upstream <c>check_flights</c> step returns a price
    /// that differs from <see cref="BookOrderRequest.AgreedPrice"/>. The
    /// controller maps this to a 409 with the new price so the UI can
    /// surface a "the price changed — confirm again?" modal.
    /// </summary>
    public sealed class PriceChangedException : InvalidOperationException
    {
        public decimal OldPrice { get; }
        public decimal NewPrice { get; }
        public string Currency { get; }
        public PriceChangedException(decimal oldPrice, decimal newPrice, string currency)
            : base($"מחיר ההזמנה השתנה. המחיר החדש: {newPrice:0.00} {currency}.")
        {
            OldPrice = oldPrice;
            NewPrice = newPrice;
            Currency = currency;
        }
    }

    /// <summary>
    /// Thrown when the upstream rejects the itinerary as no-longer
    /// bookable (sold out, time-elapsed, fare pulled). Distinct from
    /// <see cref="PriceChangedException"/> because retrying with a higher
    /// agreed price won't help — the user has to search again.
    /// </summary>
    public sealed class OfferNoLongerAvailableException : InvalidOperationException
    {
        public OfferNoLongerAvailableException()
            : base("ההצעה כבר אינה זמינה. נסו לחפש שוב.") { }
    }
}
