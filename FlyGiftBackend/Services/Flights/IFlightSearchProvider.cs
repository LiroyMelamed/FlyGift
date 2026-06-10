namespace FlyGiftBackend.Services.Flights
{
    /// <summary>
    /// Provider contract — implement once per real GDS (Duffel, Amadeus, Sabre).
    /// Keep return types provider-neutral so the booking pipeline never knows
    /// which upstream produced an offer.
    /// </summary>
    public interface IFlightSearchProvider
    {
        string ProviderName { get; }
        /// <summary>
        /// True when the provider is pointed at sandbox/test endpoints (or is
        /// the deterministic mock). The booking pipeline tags resulting rows
        /// with <c>BookingStatus.TestConfirmed</c> so Neon DB records reflect
        /// that no real money moved.
        /// </summary>
        bool IsTestMode { get; }
        Task<List<FlightOffer>> SearchAsync(FlightSearchRequest request, CancellationToken ct);
        Task<FlightOffer?> GetOfferAsync(string offerId, CancellationToken ct);
    }
}
