using System.Text;
using System.Text.Json;

namespace FlyGiftBackend.Services.Flights
{
    /// <summary>
    /// Generates deterministic mock offers from a hash of the search inputs so
    /// that re-searching shows the same prices, and the booking endpoint can
    /// re-resolve an offer from its base64-encoded id without a server cache.
    /// Replace with DuffelFlightSearchProvider in production.
    /// </summary>
    public class MockFlightSearchProvider : IFlightSearchProvider
    {
        public string ProviderName => "Mock";

        private static readonly CarrierInfo[] Carriers =
        {
            new() { Iata = "LY", Name = "El Al",        LogoUrl = "/carriers/ly.svg" },
            new() { Iata = "AF", Name = "Air France",   LogoUrl = "/carriers/af.svg" },
            new() { Iata = "BA", Name = "British Airways", LogoUrl = "/carriers/ba.svg" },
            new() { Iata = "LH", Name = "Lufthansa",    LogoUrl = "/carriers/lh.svg" },
            new() { Iata = "DL", Name = "Delta",        LogoUrl = "/carriers/dl.svg" },
            new() { Iata = "EK", Name = "Emirates",     LogoUrl = "/carriers/ek.svg" },
        };

        public Task<List<FlightOffer>> SearchAsync(FlightSearchRequest request, CancellationToken ct)
        {
            var origin = AirportDirectory.Find(request.Origin)
                ?? throw new InvalidOperationException($"Unknown origin '{request.Origin}'");
            var destination = AirportDirectory.Find(request.Destination)
                ?? throw new InvalidOperationException($"Unknown destination '{request.Destination}'");

            var seed = HashCode.Combine(request.Origin, request.Destination, request.DepartureDate.Date);
            var rng = new Random(seed);

            var offers = new List<FlightOffer>();
            for (int i = 0; i < 6; i++)
            {
                var carrier = Carriers[(seed + i) % Carriers.Length < 0 ? 0 : (Math.Abs(seed + i) % Carriers.Length)];
                var stops = i switch { 0 or 1 => 0, 2 or 3 => 1, _ => 2 };
                var basePrice = Math.Round(180m + rng.Next(0, 600) + (stops == 0 ? 60 : 0), 2);
                var taxes = Math.Round(basePrice * 0.18m, 2);
                var total = basePrice + taxes;

                var depTime = request.DepartureDate.Date.AddHours(6 + i * 2 + rng.Next(0, 2));
                var durationMin = 180 + rng.Next(0, 240) + stops * 90;
                var arrTime = depTime.AddMinutes(durationMin);

                var flightNumber = $"{carrier.Iata}{rng.Next(100, 999)}";
                var aircraft = rng.Next(0, 2) == 0 ? "Boeing 787" : "Airbus A350";

                var slice = new FlightSlice
                {
                    Origin = ToPlace(origin),
                    Destination = ToPlace(destination),
                    DepartureUtc = depTime,
                    ArrivalUtc = arrTime,
                    DurationMinutes = durationMin,
                    Segments = new List<FlightSegment>
                    {
                        new()
                        {
                            FlightNumber = flightNumber,
                            MarketingCarrier = carrier,
                            Origin = ToPlace(origin),
                            Destination = ToPlace(destination),
                            DepartureUtc = depTime,
                            ArrivalUtc = arrTime,
                            Aircraft = aircraft,
                        }
                    }
                };

                var slices = new List<FlightSlice> { slice };

                // Round-trip: append a return slice from destination → origin on
                // the requested return date. Same carrier/aircraft so the offer
                // reads as a single coherent itinerary.
                if (request.ReturnDate.HasValue)
                {
                    var retDepTime = request.ReturnDate.Value.Date.AddHours(8 + i * 2 + rng.Next(0, 2));
                    var retDurationMin = 180 + rng.Next(0, 240) + stops * 90;
                    var retArrTime = retDepTime.AddMinutes(retDurationMin);
                    var retFlightNumber = $"{carrier.Iata}{rng.Next(100, 999)}";

                    slices.Add(new FlightSlice
                    {
                        Origin = ToPlace(destination),
                        Destination = ToPlace(origin),
                        DepartureUtc = retDepTime,
                        ArrivalUtc = retArrTime,
                        DurationMinutes = retDurationMin,
                        Segments = new List<FlightSegment>
                        {
                            new()
                            {
                                FlightNumber = retFlightNumber,
                                MarketingCarrier = carrier,
                                Origin = ToPlace(destination),
                                Destination = ToPlace(origin),
                                DepartureUtc = retDepTime,
                                ArrivalUtc = retArrTime,
                                Aircraft = aircraft,
                            }
                        }
                    });

                    // Round-trip pricing: ~1.85x the one-way (typical airline yield).
                    basePrice = Math.Round(basePrice * 1.85m, 2);
                    taxes = Math.Round(basePrice * 0.18m, 2);
                    total = basePrice + taxes;
                    durationMin += retDurationMin;
                }

                var offer = new FlightOffer
                {
                    Source = ProviderName,
                    Carrier = carrier,
                    Slices = slices,
                    Price = new PriceDetails
                    {
                        Base = basePrice,
                        Taxes = taxes,
                        Total = total,
                        Currency = "USD",
                        MarketMedian = Math.Round(total * (1 + (rng.Next(-5, 20) / 100m)), 2),
                    },
                    Stops = stops,
                    TotalDurationMinutes = durationMin,
                    ExpiresAt = DateTime.UtcNow.AddMinutes(20),
                };
                offer.Id = EncodeOfferId(offer);
                offers.Add(offer);
            }

            return Task.FromResult(offers);
        }

        public Task<FlightOffer?> GetOfferAsync(string offerId, CancellationToken ct)
        {
            try
            {
                var json = Encoding.UTF8.GetString(Convert.FromBase64String(UnPad(offerId)));
                var offer = JsonSerializer.Deserialize<FlightOffer>(json, JsonOpts);
                return Task.FromResult(offer);
            }
            catch
            {
                return Task.FromResult<FlightOffer?>(null);
            }
        }

        private static readonly JsonSerializerOptions JsonOpts = new()
        {
            PropertyNameCaseInsensitive = true,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        };

        private static string EncodeOfferId(FlightOffer offer)
        {
            // Snapshot the offer (without its own id) into a base64 token so the
            // booking endpoint can re-resolve it without server-side state.
            // For real providers this becomes the upstream offer id (Duffel: "off_...").
            var clone = new FlightOffer
            {
                Source = offer.Source,
                Carrier = offer.Carrier,
                Slices = offer.Slices,
                Price = offer.Price,
                Stops = offer.Stops,
                TotalDurationMinutes = offer.TotalDurationMinutes,
                ExpiresAt = offer.ExpiresAt,
            };
            var json = JsonSerializer.Serialize(clone, JsonOpts);
            return "mock_" + Pad(Convert.ToBase64String(Encoding.UTF8.GetBytes(json)));
        }

        private static string Pad(string s) => s.Replace('+', '-').Replace('/', '_').TrimEnd('=');
        private static string UnPad(string s)
        {
            var raw = s.StartsWith("mock_") ? s[5..] : s;
            raw = raw.Replace('-', '+').Replace('_', '/');
            return raw.PadRight(raw.Length + (4 - raw.Length % 4) % 4, '=');
        }

        private static Place ToPlace(Airport a) => new()
        {
            Iata = a.Iata,
            Name = a.Name,
            City = a.City,
            Country = a.Country,
        };
    }
}
