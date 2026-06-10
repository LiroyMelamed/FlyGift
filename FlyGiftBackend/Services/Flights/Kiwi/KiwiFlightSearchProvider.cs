using System.Globalization;

namespace FlyGiftBackend.Services.Flights.Kiwi
{
    /// <summary>
    /// Talks to Kiwi.com's Tequila <c>/v2/search</c> and translates each
    /// returned itinerary into FlyGift's provider-neutral <see cref="FlightOffer"/>
    /// shape so the controller, frontend, and booking pipeline stay unchanged.
    ///
    /// The Tequila <c>itinerary.id</c> is stored directly as <see cref="FlightOffer.Id"/>
    /// — no token games. The <c>booking_token</c> is preserved on
    /// <see cref="FlightOffer.ProviderToken"/> (server-only — <see cref="JsonIgnoreAttribute"/>)
    /// so the Booking API chain (check_flights → save_booking → confirm_payment)
    /// can pick it up. Tequila's docs require this token to be no older than
    /// 30 minutes; offers expire at 20 minutes, well inside that window.
    /// </summary>
    public sealed class KiwiFlightSearchProvider : IFlightSearchProvider
    {
        private readonly KiwiApiClient _api;
        private readonly KiwiOptions _opts;
        private readonly ILogger<KiwiFlightSearchProvider> _log;

        // In-memory offer cache so /BookFlight can re-resolve an offer within
        // the search session without hitting Tequila again. 20-min TTL matches
        // the FlightOffer.ExpiresAt we publish to the UI.
        private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, (FlightOffer Offer, DateTime ExpiresAt)>
            _cache = new();

        public KiwiFlightSearchProvider(
            KiwiApiClient api,
            Microsoft.Extensions.Options.IOptions<KiwiOptions> opts,
            ILogger<KiwiFlightSearchProvider> log)
        {
            _api = api;
            _opts = opts.Value;
            _log = log;
        }

        public string ProviderName => $"Kiwi.com Tequila ({_opts.Mode})";

        public bool IsTestMode => _opts.Mode != KiwiEnvironment.Production;

        public async Task<List<FlightOffer>> SearchAsync(FlightSearchRequest request, CancellationToken ct)
        {
            // Tequila uses dd/MM/yyyy, ILS as a forced currency, and a single
            // `apikey` header (set on the typed HttpClient ctor).
            var qs = new Dictionary<string, string>
            {
                ["fly_from"] = request.Origin.ToUpperInvariant(),
                ["fly_to"] = request.Destination.ToUpperInvariant(),
                ["date_from"] = request.DepartureDate.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture),
                ["date_to"] = request.DepartureDate.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture),
                ["adults"] = Math.Max(1, request.Passengers).ToString(CultureInfo.InvariantCulture),
                ["curr"] = _opts.Currency,
                ["locale"] = _opts.Locale,
                ["selected_cabins"] = MapCabin(request.Cabin),
                ["limit"] = _opts.MaxOffers.ToString(CultureInfo.InvariantCulture),
                // Sort by total price — best-price badge logic in FlightSearchService
                // re-tags after aggregation across providers anyway.
                ["sort"] = "price",
            };
            if (request.ReturnDate.HasValue)
            {
                qs["return_from"] = request.ReturnDate.Value.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture);
                qs["return_to"] = request.ReturnDate.Value.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture);
            }

            var resp = await _api.SearchAsync(qs, ct);
            var currency = string.IsNullOrWhiteSpace(resp.Currency) ? _opts.Currency : resp.Currency;

            // Stand-in market median for the existing best-price badge logic
            // (Tequila doesn't expose peer pricing directly).
            var prices = resp.Data.Select(d => d.Price).OrderBy(p => p).ToList();
            var median = prices.Count == 0 ? 0m : prices[prices.Count / 2];

            var offers = resp.Data
                .Take(_opts.MaxOffers)
                .Select(d => MapItinerary(d, currency, median))
                .ToList();

            // Cache for the booking-step lookup. Cleanup happens lazily below.
            var now = DateTime.UtcNow;
            foreach (var o in offers) _cache[o.Id] = (o, o.ExpiresAt);
            CleanupExpired(now);

            return offers;
        }

        public Task<FlightOffer?> GetOfferAsync(string offerId, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(offerId)) return Task.FromResult<FlightOffer?>(null);
            // Mock-encoded tokens belong to the mock provider.
            if (offerId.StartsWith("mock_", StringComparison.Ordinal)) return Task.FromResult<FlightOffer?>(null);

            // Synthetic round-trip from the frontend's combineOffers(): the
            // user picked an outbound from one search and a return from a
            // second (reverse-direction) search, and the UI fused them into
            // one offer keyed `combo:OUT_ID+RET_ID`. Tequila itinerary IDs
            // use `|` and `_` but not `+`, so splitting on the first `+`
            // is unambiguous.
            if (offerId.StartsWith("combo:", StringComparison.Ordinal))
            {
                var rest = offerId.Substring("combo:".Length);
                var sep = rest.IndexOf('+');
                if (sep <= 0 || sep == rest.Length - 1) return Task.FromResult<FlightOffer?>(null);
                var outId = rest.Substring(0, sep);
                var retId = rest.Substring(sep + 1);

                var now = DateTime.UtcNow;
                if (!_cache.TryGetValue(outId, out var outE) || outE.ExpiresAt <= now)
                    return Task.FromResult<FlightOffer?>(null);
                if (!_cache.TryGetValue(retId, out var retE) || retE.ExpiresAt <= now)
                    return Task.FromResult<FlightOffer?>(null);

                return Task.FromResult<FlightOffer?>(CombineOffers(outE.Offer, retE.Offer, offerId));
            }

            if (_cache.TryGetValue(offerId, out var entry) && entry.ExpiresAt > DateTime.UtcNow)
                return Task.FromResult<FlightOffer?>(entry.Offer);

            return Task.FromResult<FlightOffer?>(null);
        }

        // Mirrors the frontend's FlightBookingFlow.combineOffers: take the
        // outbound's first slice + the return's first slice, sum the
        // prices, and use the earlier of the two expiries so we never
        // accept a stale combo.
        private static FlightOffer CombineOffers(FlightOffer outOffer, FlightOffer ret, string id)
        {
            var slices = new List<FlightSlice>();
            if (outOffer.Slices.Count > 0) slices.Add(outOffer.Slices[0]);
            if (ret.Slices.Count > 0) slices.Add(ret.Slices[0]);

            var price = new PriceDetails
            {
                Total = outOffer.Price.Total + ret.Price.Total,
                Base = outOffer.Price.Base + ret.Price.Base,
                Taxes = outOffer.Price.Taxes + ret.Price.Taxes,
                Currency = outOffer.Price.Currency,
                MarketMedian = outOffer.Price.MarketMedian + ret.Price.MarketMedian,
            };

            var expiry = outOffer.ExpiresAt < ret.ExpiresAt ? outOffer.ExpiresAt : ret.ExpiresAt;
            var stops = slices.Sum(s => Math.Max(0, s.Segments.Count - 1));
            var totalDuration = slices.Sum(s => s.DurationMinutes);

            return new FlightOffer
            {
                Id = id,
                Source = outOffer.Source,
                Carrier = outOffer.Carrier,
                Slices = slices,
                Price = price,
                Stops = stops,
                TotalDurationMinutes = totalDuration,
                ExpiresAt = expiry,
                // No single booking_token spans two independent Tequila
                // searches — the Booking API would need to be invoked once
                // per leg. Leave null so the booking pipeline can detect
                // this case and fall back to the deep_link or split flow.
                ProviderToken = null,
            };
        }

        // -------- mapping --------

        private FlightOffer MapItinerary(TequilaItinerary it, string currency, decimal marketMedian)
        {
            // Tequila returns a single flat list of segments; split by `return`
            // flag (0 = outbound, 1 = inbound) into FlyGift's per-slice shape.
            var outboundSegs = it.Route.Where(r => r.Return == 0).ToList();
            var returnSegs = it.Route.Where(r => r.Return == 1).ToList();

            var slices = new List<FlightSlice>();
            if (outboundSegs.Count > 0) slices.Add(BuildSlice(outboundSegs));
            if (returnSegs.Count > 0) slices.Add(BuildSlice(returnSegs));

            // Carrier = the first marketing carrier on the outbound. Logos are
            // not in the Tequila response; UI falls back to /carriers/{iata}.svg.
            var carrierIata = (outboundSegs.FirstOrDefault()?.Airline ?? it.Airlines.FirstOrDefault() ?? "").ToUpperInvariant();
            var carrier = new CarrierInfo
            {
                Iata = carrierIata,
                Name = carrierIata, // Tequila does not return airline display name
                LogoUrl = string.IsNullOrEmpty(carrierIata) ? "" : $"/carriers/{carrierIata.ToLowerInvariant()}.svg",
            };

            var stops = slices.Sum(s => Math.Max(0, s.Segments.Count - 1));
            var totalDuration = it.Duration?.TotalSeconds > 0
                ? it.Duration.TotalSeconds / 60
                : slices.Sum(s => s.DurationMinutes);

            // Tequila returns a single total price across all pax in the
            // requested currency. Taxes are not broken out separately — we
            // approximate with a flat 0 base/total split so the existing
            // PriceDetails contract stays satisfied.
            var price = new PriceDetails
            {
                Total = it.Price,
                Base = it.Price,
                Taxes = 0m,
                Currency = currency,
                MarketMedian = marketMedian,
            };

            return new FlightOffer
            {
                Id = it.Id,
                Source = ProviderName,
                Carrier = carrier,
                Slices = slices,
                Price = price,
                Stops = stops,
                TotalDurationMinutes = totalDuration,
                ExpiresAt = DateTime.UtcNow.AddMinutes(20),
                // Booking API hand-off token. May be null if the Tequila
                // account isn't entitled to the Booking API — in that case
                // the booking pipeline must fall back to the deep_link.
                ProviderToken = string.IsNullOrWhiteSpace(it.BookingToken) ? null : it.BookingToken,
            };
        }

        private static FlightSlice BuildSlice(List<TequilaSegment> segs)
        {
            var first = segs.First();
            var last = segs.Last();
            var dep = DateTime.SpecifyKind(first.DepartureUtc, DateTimeKind.Utc);
            var arr = DateTime.SpecifyKind(last.ArrivalUtc, DateTimeKind.Utc);

            return new FlightSlice
            {
                Origin = new Place { Iata = first.FlyFrom ?? "", City = first.CityFrom ?? "", Name = first.CityFrom ?? "" },
                Destination = new Place { Iata = last.FlyTo ?? "", City = last.CityTo ?? "", Name = last.CityTo ?? "" },
                DepartureUtc = dep,
                ArrivalUtc = arr,
                DurationMinutes = (int)(arr - dep).TotalMinutes,
                Segments = segs.Select(MapSegment).ToList(),
            };
        }

        private static FlightSegment MapSegment(TequilaSegment s)
        {
            var iata = (s.Airline ?? "").ToUpperInvariant();
            var carrier = new CarrierInfo
            {
                Iata = iata,
                Name = iata,
                LogoUrl = string.IsNullOrEmpty(iata) ? "" : $"/carriers/{iata.ToLowerInvariant()}.svg",
            };
            return new FlightSegment
            {
                FlightNumber = $"{iata}{s.FlightNumber}",
                MarketingCarrier = carrier,
                Origin = new Place { Iata = s.FlyFrom ?? "", City = s.CityFrom ?? "", Name = s.CityFrom ?? "" },
                Destination = new Place { Iata = s.FlyTo ?? "", City = s.CityTo ?? "", Name = s.CityTo ?? "" },
                DepartureUtc = DateTime.SpecifyKind(s.DepartureUtc, DateTimeKind.Utc),
                ArrivalUtc = DateTime.SpecifyKind(s.ArrivalUtc, DateTimeKind.Utc),
                Aircraft = s.Equipment ?? "",
            };
        }

        private static string MapCabin(CabinClass c) => c switch
        {
            CabinClass.PremiumEconomy => "W",
            CabinClass.Business => "C",
            CabinClass.First => "F",
            _ => "M",
        };

        private static void CleanupExpired(DateTime now)
        {
            // Cheap O(n) sweep — the cache only ever holds the last few
            // searches' worth of offers (capped by Tequila's response size).
            foreach (var (key, entry) in _cache)
            {
                if (entry.ExpiresAt <= now) _cache.TryRemove(key, out _);
            }
        }
    }
}
