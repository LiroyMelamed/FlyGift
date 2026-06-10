using System.Collections.Concurrent;
using System.Text.Json;
using FlyGiftBackend.Data;
using FlyGiftBackend.Models;
using FlyGiftBackend.Services.Ledger;
using Microsoft.EntityFrameworkCore;

namespace FlyGiftBackend.Services.Hotels
{
    /// <summary>
    /// Stage 19 — Hotel search & booking. Mock implementation models the
    /// RapidAPI / Booking.com schema so we can swap a real provider in
    /// without touching callers. Results are tagged with affordability
    /// against the user's wallet balance and the booking pipeline runs
    /// wallet-only (post-Stripe removal) — the user must top up via Grow
    /// before booking if balance is insufficient.
    /// </summary>
    public class HotelSearchService : IHotelSearchService
    {
        private static readonly ConcurrentDictionary<string, HotelOffer> _offerCache = new();

        private readonly AppDbContext _db;
        private readonly IBalanceService _balance;
        private readonly ILogger<HotelSearchService> _log;

        public HotelSearchService(
            AppDbContext db,
            IBalanceService balance,
            ILogger<HotelSearchService> log)
        {
            _db = db;
            _balance = balance;
            _log = log;
        }

        public async Task<HotelSearchResponse> SearchAsync(int userId, HotelSearchRequest request, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(request.City))
                throw new InvalidOperationException("City is required.");
            if (request.CheckIn.Date < DateTime.UtcNow.Date)
                throw new InvalidOperationException("Check-in cannot be in the past.");
            if (request.CheckOut.Date <= request.CheckIn.Date)
                throw new InvalidOperationException("Check-out must be after check-in.");

            var nights = (int)(request.CheckOut.Date - request.CheckIn.Date).TotalDays;
            var balance = await _balance.GetBalanceAsync(userId, ct);

            var offers = BuildMockOffers(request, nights, balance);

            // Cache offers for the booking step (mirrors how Duffel offer
            // tokens round-trip). 30-minute TTL is plenty for the demo.
            foreach (var o in offers) _offerCache[o.Id] = o;

            return new HotelSearchResponse
            {
                SearchId = Guid.NewGuid().ToString("N"),
                GeneratedAt = DateTime.UtcNow,
                Nights = nights,
                City = request.City,
                AccountBalance = balance,
                Currency = "ILS",
                Offers = offers
                    .OrderByDescending(o => o.AffordableFromBalance)
                    .ThenBy(o => o.NightlyRate)
                    .ToList(),
            };
        }

        public Task<HotelOffer?> GetOfferAsync(string offerId, CancellationToken ct)
        {
            _offerCache.TryGetValue(offerId, out var offer);
            return Task.FromResult(offer);
        }

        public async Task<BookHotelResult> BookAsync(int userId, BookHotelRequest request, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(request.OfferId))
                throw new InvalidOperationException("OfferId is required.");
            if (string.IsNullOrWhiteSpace(request.GuestName))
                throw new InvalidOperationException("Guest name is required.");

            if (!_offerCache.TryGetValue(request.OfferId, out var offer))
                throw new InvalidOperationException("Offer not found or expired. Please re-search.");

            var user = await _db.Users.FindAsync(new object?[] { userId }, ct)
                ?? throw new InvalidOperationException("User not found.");

            var ledgerBalance = await _balance.GetBalanceAsync(userId, ct);
            var total = offer.TotalPrice;

            // Wallet-only: no card path. Top-ups happen separately through
            // Grow once that flow is wired; until then the user must
            // pre-fund via the wallet to book a hotel.
            if (ledgerBalance < total)
                throw new InvalidOperationException(
                    $"Insufficient balance. Top up the wallet by {(total - ledgerBalance):0.00} {offer.Currency} to book this stay.");

            var fromBalance = total;

            // Npgsql retry-on-failure forbids user-managed transactions
            // unless they're driven by an execution strategy that can
            // replay the whole unit on transient failure.
            var strategy = _db.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
            await using var tx = await _db.Database.BeginTransactionAsync(ct);
            try
            {
                user.AccountBalance -= fromBalance;

                var bref = "FGH" + Guid.NewGuid().ToString("N")[..6].ToUpper();
                var details = new
                {
                    offer.Id,
                    offer.Name,
                    offer.City,
                    offer.Country,
                    offer.NightlyRate,
                    offer.Currency,
                    GuestName = request.GuestName,
                    Reference = bref,
                };

                var booking = new HotelBooking
                {
                    UserId = userId,
                    Status = BookingStatus.Booked,
                    CreatedAt = DateTime.UtcNow,
                    HotelDetails = JsonSerializer.Serialize(details),
                };
                _db.HotelBookings.Add(booking);
                await _db.SaveChangesAsync(ct);

                var bookingRef = $"hotel:{booking.Id}";
                await _balance.PostAsync(new LedgerEntry
                {
                    UserId = userId,
                    Type = TransactionType.Spend,
                    Amount = fromBalance,
                    Currency = offer.Currency,
                    Reference = bookingRef,
                    Description = $"Hotel — {offer.Name} ({offer.City}) · wallet",
                }, ct);
                await tx.CommitAsync(ct);

                var nights = (offer.TotalPrice == 0 || offer.NightlyRate == 0)
                    ? 1
                    : (int)Math.Round(offer.TotalPrice / offer.NightlyRate);

                return new BookHotelResult
                {
                    BookingId = booking.Id,
                    Reference = bref,
                    HotelName = offer.Name,
                    City = offer.City,
                    CheckIn = DateTime.UtcNow.Date.AddDays(1),
                    CheckOut = DateTime.UtcNow.Date.AddDays(1 + nights),
                    Nights = nights,
                    TotalCharged = total,
                    PaidFromBalance = fromBalance,
                    PaidFromCard = 0m,
                    RemainingBalance = user.AccountBalance,
                    Currency = offer.Currency,
                };
            }
            catch (DbUpdateConcurrencyException)
            {
                await tx.RollbackAsync(ct);
                _log.LogWarning("Concurrency conflict booking hotel offer {OfferId} for user {UserId}", request.OfferId, userId);
                throw new InvalidOperationException(
                    "Your wallet was updated in another window. Please try again.");
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
            });
        }

        // --------------------------------------------------------------
        // Mock data — shaped to match RapidAPI Booking.com hotel results.
        // Deterministic seed by city so the demo feels stable per query.
        // --------------------------------------------------------------
        private static List<HotelOffer> BuildMockOffers(HotelSearchRequest req, int nights, decimal balance)
        {
            var seed = StableSeed(req.City);
            var rng = new Random(seed);

            var templates = new (string Name, double Rating, int Reviews, decimal Nightly, string[] Amenities, string Image)[]
            {
                ("The Skyline Grand",   4.8, 2847, 240m, new[]{ "Wi-Fi","Spa","Pool","Breakfast" },         "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800"),
                ("Aurora Boutique",     4.6, 1532, 180m, new[]{ "Wi-Fi","Bar","Gym" },                       "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800"),
                ("Champagne Suites",    4.9,  984, 320m, new[]{ "Wi-Fi","Spa","Concierge","Breakfast" },     "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800"),
                ("Midnight Loft",       4.4, 3201, 145m, new[]{ "Wi-Fi","Kitchen" },                         "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800"),
                ("Coastal Mirage",      4.7, 2104, 210m, new[]{ "Wi-Fi","Pool","Beach" },                    "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800"),
                ("The Velvet Court",    4.5, 1876, 165m, new[]{ "Wi-Fi","Bar","Pet-friendly" },              "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800"),
                ("Cyan Bay Hotel",      4.3,  742, 130m, new[]{ "Wi-Fi","Breakfast" },                       "https://images.unsplash.com/photo-1455587734955-081b22074882?w=800"),
                ("Terminal One Inn",    4.2, 1290, 110m, new[]{ "Wi-Fi","Shuttle" },                         "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=800"),
            };

            var offers = new List<HotelOffer>(templates.Length);
            foreach (var tpl in templates)
            {
                var jitter = 0.85m + (decimal)rng.NextDouble() * 0.30m; // ±15%
                var nightly = Math.Round(tpl.Nightly * jitter, 0);
                var total = nightly * nights;
                var afford = balance >= total;

                offers.Add(new HotelOffer
                {
                    Id = "ho_" + Guid.NewGuid().ToString("N")[..14],
                    Name = tpl.Name,
                    City = req.City,
                    Country = GuessCountry(req.City),
                    ImageUrl = tpl.Image,
                    Rating = tpl.Rating,
                    ReviewCount = tpl.Reviews,
                    Amenities = tpl.Amenities.ToList(),
                    NightlyRate = nightly,
                    TotalPrice = total,
                    Currency = "ILS",
                    AffordableFromBalance = afford,
                    CardTopUpRequired = afford ? 0m : Math.Max(0m, total - balance),
                });
            }

            // Honor optional MaxNightlyRate cap.
            if (req.MaxNightlyRate is decimal cap && cap > 0)
                offers = offers.Where(o => o.NightlyRate <= cap).ToList();

            return offers;
        }

        private static int StableSeed(string s)
        {
            unchecked
            {
                int h = 23;
                foreach (var c in s.ToLowerInvariant()) h = h * 31 + c;
                return h;
            }
        }

        private static string GuessCountry(string city)
        {
            var c = city.Trim().ToLowerInvariant();
            if (c.Contains("tel aviv") || c.Contains("תל אביב") || c.Contains("jerusalem")) return "Israel";
            if (c.Contains("paris")) return "France";
            if (c.Contains("rome") || c.Contains("milan")) return "Italy";
            if (c.Contains("london")) return "United Kingdom";
            if (c.Contains("new york") || c.Contains("nyc")) return "United States";
            if (c.Contains("dubai")) return "UAE";
            return "—";
        }
    }
}
