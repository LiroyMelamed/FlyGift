using System.Security.Claims;
using System.Text.Json;
using FlyGiftBackend.Data;
using FlyGiftBackend.Models;
using FlyGiftBackend.Services.Wallet;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlyGiftBackend.Controllers
{
    /// <summary>
    /// Stage 14 — Travel Hub aggregation. Returns the user's flights
    /// (split into upcoming/past) plus the gift-card wallet snapshot
    /// in a single round-trip so the timeline view renders in one call.
    /// </summary>
    [ApiController]
    [Authorize]
    [Route("api/Bookings")]
    public class MyTripsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public MyTripsController(AppDbContext db) => _db = db;

        private int CurrentUserId() =>
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        [HttpGet("MyTrips")]
        public async Task<ActionResult<GeneralResponse>> GetMyTrips(CancellationToken ct)
        {
            var userId = CurrentUserId();
            var now = DateTime.UtcNow;

            var bookings = await _db.FlightBookings
                .AsNoTracking()
                .Where(b => b.UserId == userId)
                .OrderByDescending(b => b.CreatedAt)
                .ToListAsync(ct);

            var trips = bookings.Select(b => MapTrip(b, now)).ToList();

            var giftCards = await _db.GiftCards
                .AsNoTracking()
                .Where(g => g.RecipientId == userId)
                .OrderByDescending(g => g.CreatedAt)
                .ToListAsync(ct);

            var totalActiveBalance = giftCards
                .Where(g => g.Status == GiftCardStatus.Active)
                .Sum(g => g.Amount);

            var summary = new
            {
                upcoming = trips.Where(t => t.IsUpcoming).ToList(),
                past = trips.Where(t => !t.IsUpcoming).ToList(),
                wallet = new
                {
                    activeGiftCount = giftCards.Count(g => g.Status == GiftCardStatus.Active),
                    totalActiveBalance,
                    currency = giftCards.FirstOrDefault()?.Currency ?? "ILS",
                },
            };

            return Ok(new GeneralResponse(true, "OK", Request.Path, summary));
        }

        private static TripDto MapTrip(FlightBooking booking, DateTime now)
        {
            BoardingPassData? bp = null;
            if (!string.IsNullOrWhiteSpace(booking.BoardingPassData))
            {
                try
                {
                    bp = JsonSerializer.Deserialize<BoardingPassData>(
                        booking.BoardingPassData,
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                }
                catch { /* tolerated — older rows */ }
            }

            decimal? total = null;
            string? carrier = null;
            int? stops = null;
            if (!string.IsNullOrWhiteSpace(booking.FlightDetails))
            {
                try
                {
                    using var doc = JsonDocument.Parse(booking.FlightDetails);
                    if (doc.RootElement.TryGetProperty("Price", out var p) &&
                        p.TryGetProperty("Total", out var t)) total = t.GetDecimal();
                    if (doc.RootElement.TryGetProperty("Carrier", out var c) &&
                        c.TryGetProperty("Name", out var n)) carrier = n.GetString();
                    if (doc.RootElement.TryGetProperty("Stops", out var s)) stops = s.GetInt32();
                }
                catch { /* tolerated */ }
            }

            var dep = bp?.DepartureUtc;
            var isUpcoming = booking.Status == BookingStatus.Booked &&
                             dep.HasValue && dep.Value > now;

            return new TripDto
            {
                BookingId = booking.Id,
                Status = booking.Status.ToString(),
                FlightNumber = bp?.FlightNumber ?? "",
                Carrier = carrier ?? bp?.Carrier ?? "",
                Origin = bp?.Origin ?? "",
                OriginCity = bp?.OriginCity ?? "",
                Destination = bp?.Destination ?? "",
                DestinationCity = bp?.DestinationCity ?? "",
                DepartureUtc = dep,
                ArrivalUtc = bp?.ArrivalUtc,
                Gate = bp?.Gate,
                Seat = bp?.Seat,
                Terminal = bp?.Terminal,
                BookingReference = bp?.BookingReference,
                TotalCharged = total,
                Stops = stops,
                FlightStatus = MockFlightStatus(booking.Id, dep, now),
                IsUpcoming = isUpcoming,
                CreatedAt = booking.CreatedAt,
            };
        }

        /// <summary>
        /// Deterministic mock flight-status. Replace with FlightAware /
        /// Cirium AeroAPI in prod by introducing IFlightStatusProvider.
        /// </summary>
        private static string MockFlightStatus(int id, DateTime? dep, DateTime now)
        {
            if (!dep.HasValue) return "Unknown";
            if (dep.Value < now.AddHours(-3)) return "Arrived";
            if (dep.Value < now) return "Boarding";
            return (id % 7) switch
            {
                0 => "Delayed",
                1 => "Gate Change",
                _ => "On Time",
            };
        }
    }

    public class TripDto
    {
        public int BookingId { get; set; }
        public string Status { get; set; } = "";
        public string FlightNumber { get; set; } = "";
        public string Carrier { get; set; } = "";
        public string Origin { get; set; } = "";
        public string OriginCity { get; set; } = "";
        public string Destination { get; set; } = "";
        public string DestinationCity { get; set; } = "";
        public DateTime? DepartureUtc { get; set; }
        public DateTime? ArrivalUtc { get; set; }
        public string? Gate { get; set; }
        public string? Seat { get; set; }
        public string? Terminal { get; set; }
        public string? BookingReference { get; set; }
        public decimal? TotalCharged { get; set; }
        public int? Stops { get; set; }
        public string FlightStatus { get; set; } = "On Time";
        public bool IsUpcoming { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
