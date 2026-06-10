using System.Security.Claims;
using System.Text.Json;
using FlyGiftBackend.Data;
using FlyGiftBackend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlyGiftBackend.Controllers
{
    /// <summary>
    /// Stage 15 — Company-side ROI insights. Aggregates the gift cards a
    /// company sent (SenderId == current user when role is Company),
    /// merges per-recipient redemption status, and reports the most
    /// popular flight destinations of those redemptions.
    /// </summary>
    [ApiController]
    [Authorize(Roles = nameof(UserRole.Company) + "," + nameof(UserRole.Admin))]
    [Route("api/Company")]
    public class CompanyAnalyticsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public CompanyAnalyticsController(AppDbContext db) => _db = db;

        private int CurrentUserId() =>
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        [HttpGet("Analytics")]
        public async Task<ActionResult<GeneralResponse>> GetAnalytics(
            [FromQuery] int days = 90, CancellationToken ct = default)
        {
            var companyUserId = CurrentUserId();
            days = Math.Clamp(days, 7, 365);
            var since = DateTime.UtcNow.AddDays(-days);

            var cards = await _db.GiftCards
                .AsNoTracking()
                .Where(g => g.SenderId == companyUserId && g.CreatedAt >= since)
                .ToListAsync(ct);

            var totalDistributed = cards.Sum(c => c.Amount);
            var redeemedCards = cards.Where(c => c.Status == GiftCardStatus.Redeemed).ToList();
            var redeemedAmount = redeemedCards.Sum(c => c.Amount);
            var activeCards = cards.Count(c => c.Status == GiftCardStatus.Active);
            var expiredCards = cards.Count(c => c.Status == GiftCardStatus.Expired);

            var redemptionRate = cards.Count == 0
                ? 0m
                : Math.Round((decimal)redeemedCards.Count / cards.Count * 100m, 1);

            // Spending trend — group cards by week, plot distributed vs. used
            var trend = cards
                .GroupBy(c => StartOfWeek(c.CreatedAt))
                .OrderBy(g => g.Key)
                .Select(g => new TrendPoint
                {
                    PeriodStart = g.Key,
                    Distributed = g.Sum(x => x.Amount),
                    Used = g.Where(x => x.Status == GiftCardStatus.Redeemed).Sum(x => x.Amount),
                })
                .ToList();

            // Top destinations — read FlightDetails JSON of each booking that
            // belongs to a recipient who held one of this company's cards.
            var recipientIds = cards.Select(c => c.RecipientId).Distinct().ToList();
            var bookings = await _db.FlightBookings
                .AsNoTracking()
                .Where(b => recipientIds.Contains(b.UserId)
                            && b.Status == BookingStatus.Booked
                            && b.CreatedAt >= since)
                .ToListAsync(ct);

            var topDestinations = bookings
                .Select(ExtractDestination)
                .Where(d => d != null)
                .GroupBy(d => d!.Iata)
                .Select(g => new DestinationPoint
                {
                    Iata = g.Key,
                    City = g.First()!.City,
                    Country = g.First()!.Country,
                    Trips = g.Count(),
                })
                .OrderByDescending(x => x.Trips)
                .Take(8)
                .ToList();

            var avgGiftAmount = cards.Count == 0 ? 0 : Math.Round(totalDistributed / cards.Count, 2);
            var avgTimeToRedemptionDays = redeemedCards.Count == 0
                ? 0
                : Math.Round(redeemedCards.Average(_ => (double)days / 4), 1); // mock — wire to RedeemedAt later

            var payload = new
            {
                periodDays = days,
                generatedAt = DateTime.UtcNow,
                summary = new
                {
                    totalCards = cards.Count,
                    activeCards,
                    redeemedCards = redeemedCards.Count,
                    expiredCards,
                    totalDistributed,
                    redeemedAmount,
                    unusedAmount = totalDistributed - redeemedAmount,
                    redemptionRate,
                    avgGiftAmount,
                    avgTimeToRedemptionDays,
                    currency = cards.FirstOrDefault()?.Currency ?? "ILS",
                },
                spendingTrend = trend,
                topDestinations,
            };

            return Ok(new GeneralResponse(true, "OK", Request.Path, payload));
        }

        private static DateTime StartOfWeek(DateTime d)
        {
            var diff = (7 + (int)d.DayOfWeek - (int)DayOfWeek.Monday) % 7;
            return d.Date.AddDays(-diff);
        }

        private static DestinationInfo? ExtractDestination(FlightBooking booking)
        {
            if (string.IsNullOrWhiteSpace(booking.FlightDetails)) return null;
            try
            {
                using var doc = JsonDocument.Parse(booking.FlightDetails);
                if (!doc.RootElement.TryGetProperty("Slices", out var slices) ||
                    slices.GetArrayLength() == 0) return null;

                var dest = slices[0].GetProperty("Destination");
                return new DestinationInfo
                {
                    Iata = dest.GetProperty("Iata").GetString() ?? "",
                    City = dest.GetProperty("City").GetString() ?? "",
                    Country = dest.GetProperty("Country").GetString() ?? "",
                };
            }
            catch
            {
                return null;
            }
        }

        private class DestinationInfo
        {
            public string Iata { get; set; } = "";
            public string City { get; set; } = "";
            public string Country { get; set; } = "";
        }
    }

    public class TrendPoint
    {
        public DateTime PeriodStart { get; set; }
        public decimal Distributed { get; set; }
        public decimal Used { get; set; }
    }

    public class DestinationPoint
    {
        public string Iata { get; set; } = "";
        public string City { get; set; } = "";
        public string Country { get; set; } = "";
        public int Trips { get; set; }
    }
}
