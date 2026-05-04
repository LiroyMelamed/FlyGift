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
        Task<List<FlightOffer>> SearchAsync(FlightSearchRequest request, CancellationToken ct);
        Task<FlightOffer?> GetOfferAsync(string offerId, CancellationToken ct);
    }
}
