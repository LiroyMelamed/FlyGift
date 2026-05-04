namespace FlyGiftBackend.Services.Flights
{
    public interface IFlightSearchService
    {
        Task<FlightSearchResponse> SearchAsync(FlightSearchRequest request, CancellationToken ct);
    }

    /// <summary>
    /// Aggregates one or more <see cref="IFlightSearchProvider"/>s, applies
    /// price-comparison logic, and tags the cheapest viable offer with a
    /// "Best Price" badge if it beats the market median by &gt;= 5%.
    /// </summary>
    public class FlightSearchService : IFlightSearchService
    {
        private readonly IEnumerable<IFlightSearchProvider> _providers;
        private readonly ILogger<FlightSearchService> _log;

        public FlightSearchService(
            IEnumerable<IFlightSearchProvider> providers,
            ILogger<FlightSearchService> log)
        {
            _providers = providers;
            _log = log;
        }

        public async Task<FlightSearchResponse> SearchAsync(FlightSearchRequest request, CancellationToken ct)
        {
            if (request.DepartureDate.Date < DateTime.UtcNow.Date)
                throw new InvalidOperationException("Departure date cannot be in the past.");
            if (request.ReturnDate.HasValue && request.ReturnDate.Value.Date < request.DepartureDate.Date)
                throw new InvalidOperationException("Return date cannot precede the departure date.");
            if (string.Equals(request.Origin, request.Destination, StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("Origin and destination must differ.");

            var tasks = _providers.Select(p => SafeSearch(p, request, ct));
            var results = await Task.WhenAll(tasks);
            var offers = results.SelectMany(r => r).ToList();

            ApplyBestPriceBadge(offers);

            return new FlightSearchResponse
            {
                SearchId = Guid.NewGuid().ToString("N"),
                GeneratedAt = DateTime.UtcNow,
                Offers = offers
                    .OrderBy(o => o.Price.Total)
                    .ThenBy(o => o.TotalDurationMinutes)
                    .ToList(),
            };
        }

        private async Task<List<FlightOffer>> SafeSearch(
            IFlightSearchProvider provider, FlightSearchRequest req, CancellationToken ct)
        {
            try { return await provider.SearchAsync(req, ct); }
            catch (Exception ex)
            {
                _log.LogWarning(ex, "Provider {Provider} failed; continuing with remaining providers.", provider.ProviderName);
                return new List<FlightOffer>();
            }
        }

        private static void ApplyBestPriceBadge(List<FlightOffer> offers)
        {
            if (offers.Count == 0) return;
            var cheapest = offers.OrderBy(o => o.Price.Total).First();
            var marketMedian = offers.Select(o => o.Price.MarketMedian).OrderBy(x => x).ElementAt(offers.Count / 2);
            if (marketMedian <= 0) return;

            var deltaPct = (marketMedian - cheapest.Price.Total) / marketMedian;
            if (deltaPct >= 0.05m)
            {
                cheapest.IsBestPrice = true;
                cheapest.BestPriceReason = $"{Math.Round(deltaPct * 100, 0)}% below market";
            }
        }
    }
}
