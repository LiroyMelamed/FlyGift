using System.Security.Claims;
using System.Text.Json;
using FlyGiftBackend.Models;
using FlyGiftBackend.Repositories;
using FlyGiftBackend.Services;
using FlyGiftBackend.Services.Booking;
using FlyGiftBackend.Services.Flights;
using FlyGiftBackend.Services.Flights.Kiwi;
using FlyGiftBackend.Services.Wallet;
using WalletNotConfiguredException = FlyGiftBackend.Services.Wallet.WalletNotConfiguredException;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FlyGiftBackend.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/[controller]")]
    public class BookingsController : ControllerBase
    {
        private readonly FlightBookingRepository _flights;
        private readonly IWalletService _wallet;
        private readonly IBookingService _booking;
        private readonly IIdempotencyService _idem;
        private readonly ILogger<BookingsController> _log_;

        public BookingsController(
            FlightBookingRepository flights,
            IWalletService wallet,
            IBookingService booking,
            IIdempotencyService idem,
            ILogger<BookingsController> log)
        {
            _flights = flights;
            _wallet = wallet;
            _booking = booking;
            _idem = idem;
            _log_ = log;
        }

        private int GetCurrentUserId() =>
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        /// <summary>
        /// Books a flight using the offer token returned by FlightSearch.
        /// Pulls from User.AccountBalance first, then charges the supplied
        /// payment method for any remainder. Honors Idempotency-Key.
        /// </summary>
        [HttpPost("BookFlight")]
        public async Task<ActionResult<GeneralResponse>> BookFlight(
            [FromBody] BookFlightRequest request, CancellationToken ct)
        {
            var userId = GetCurrentUserId();

            var idemKey = Request.Headers["Idempotency-Key"].ToString();
            if (!string.IsNullOrWhiteSpace(idemKey))
            {
                if (idemKey.Length > 128)
                    return BadRequest(new GeneralResponse(false, "מפתח Idempotency ארוך מדי.", Request.Path));

                if (_idem.TryGet<BookFlightResult>("booking.flight", userId, idemKey, out var cached) && cached != null)
                {
                    Response.Headers["Idempotent-Replay"] = "true";
                    return Ok(new GeneralResponse(true, "Replayed.", Request.Path, cached));
                }
            }

            try
            {
                var result = await _booking.BookFlightAsync(userId, request, ct);
                if (!string.IsNullOrWhiteSpace(idemKey))
                    _idem.Save("booking.flight", userId, idemKey, result);
                return Ok(new GeneralResponse(true, "ההזמנה הושלמה.", Request.Path, result));
            }
            catch (PriceChangedException ex)
            {
                // 409 with a structured payload so the frontend can show a
                // "price changed — confirm new price?" modal and resubmit
                // with AcceptedPrice = newPrice. The wallet was not
                // touched (BookingService talks to Kiwi BEFORE the ledger
                // debit), so re-trying is safe.
                return Conflict(new GeneralResponse(false, ex.Message, Request.Path, new
                {
                    code = "price_changed",
                    oldPrice = ex.OldPrice,
                    newPrice = ex.NewPrice,
                    currency = ex.Currency,
                }));
            }
            catch (OfferNoLongerAvailableException ex)
            {
                return StatusCode(410, new GeneralResponse(false, ex.Message, Request.Path, new
                {
                    code = "offer_unavailable",
                }));
            }
            catch (InsufficientBalanceException ex)
            {
                // Structured error so the frontend can route the user to
                // the wallet top-up flow rather than dead-ending on a toast.
                return BadRequest(new GeneralResponse(false, ex.Message, Request.Path, new
                {
                    code = "insufficient_balance",
                    missingAmount = ex.MissingAmount,
                    currency = ex.Currency,
                }));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new GeneralResponse(false, ex.Message, Request.Path));
            }
            catch (KiwiApiException ex)
            {
                // Provider-level failure during the booking chain. The
                // wallet ledger isn't debited until AFTER confirm_payment
                // succeeds, so any failure here leaves the user's funds
                // untouched.
                var msg = ex.StatusCode switch
                {
                    410 => "המחיר השתנה או שההצעה פגה. נסו לחפש שוב.",
                    429 => "מערכת ההזמנות עמוסה כעת. נסו שוב בעוד מספר שניות.",
                    _ => "ההזמנה נכשלה אצל ספק הטיסות. הכסף לא חויב.",
                };
                return StatusCode(502, new GeneralResponse(false, msg, Request.Path));
            }
        }

        /// <summary>
        /// Returns the current user's flight bookings as a sanitized
        /// projection. Each row carries the parsed BoardingPassData plus
        /// the price/stops snapshot extracted from FlightDetails JSON,
        /// so the frontend can render the trips timeline directly.
        /// </summary>
        [HttpGet("Mine")]
        public async Task<MineFlightBookingListResponse> Mine(CancellationToken ct)
        {
            try
            {
                var userId = GetCurrentUserId();
                var rows = await _flights.GetByUserAsync(userId);

                var now = DateTime.UtcNow;
                var dtos = rows.Select(b => FlightBookingMineMapper.Map(b, now)).ToArray();

                return new MineFlightBookingListResponse(
                    new GeneralResponse(true, "OK", Request.Path),
                    dtos);
            }
            catch (Exception ex)
            {
                return new MineFlightBookingListResponse(
                    new GeneralResponse(false, "Internal Server Error: " + ex.Message, Request.Path),
                    Array.Empty<MineFlightBookingDto>());
            }
        }

        private static MineFlightBookingDto MapToMineDto(FlightBooking b, DateTime now)
        {
            var pass = ParseBoardingData(b);

            // FlightDetails is a JSON snapshot of `{ Carrier, Stops,
            // TotalDurationMinutes, Price, Slices }` (see BookingService).
            // We pull just the price + stops here for the trips timeline.
            decimal? totalCharged = null;
            string? currency = null;
            int? stops = null;
            if (!string.IsNullOrWhiteSpace(b.FlightDetails))
            {
                try
                {
                    using var doc = JsonDocument.Parse(b.FlightDetails);
                    var root = doc.RootElement;
                    if (root.TryGetProperty("Price", out var price) ||
                        root.TryGetProperty("price", out price))
                    {
                        if (price.TryGetProperty("Total", out var t) || price.TryGetProperty("total", out t))
                            totalCharged = t.GetDecimal();
                        if (price.TryGetProperty("Currency", out var c) || price.TryGetProperty("currency", out c))
                            currency = c.GetString();
                    }
                    if (root.TryGetProperty("Stops", out var sNum) ||
                        root.TryGetProperty("stops", out sNum))
                    {
                        if (sNum.ValueKind == JsonValueKind.Number) stops = sNum.GetInt32();
                    }
                }
                catch
                {
                    // Best-effort — if FlightDetails is malformed, the
                    // boarding data still renders.
                }
            }

            var depUtc = pass?.DepartureUtc;
            var isUpcoming = depUtc.HasValue && depUtc.Value > now;
            var flightStatus = b.Status == BookingStatus.Cancelled
                ? "Cancelled"
                : isUpcoming ? "On Time" : (depUtc.HasValue ? "Arrived" : "Unknown");

            return new MineFlightBookingDto(
                b.Id,
                b.Status.ToString(),
                pass?.FlightNumber ?? "",
                pass?.Carrier ?? "",
                pass?.Origin ?? "",
                pass?.OriginCity ?? "",
                pass?.Destination ?? "",
                pass?.DestinationCity ?? "",
                pass?.DepartureUtc,
                pass?.ArrivalUtc,
                pass?.Gate,
                pass?.Seat,
                pass?.Terminal,
                pass?.BookingReference,
                totalCharged,
                currency,
                stops,
                flightStatus,
                isUpcoming,
                b.CreatedAt
            );
        }

        /// <summary>
        /// Returns a signed Apple Wallet (.pkpass) bundle for a booking.
        /// </summary>
        [HttpGet("{id:int}/wallet-pass")]
        [Produces("application/vnd.apple.pkpass")]
        public async Task<IActionResult> GetApplePass(int id, CancellationToken ct)
        {
            var booking = _flights.GetEntityById(id);
            if (booking == null) return NotFound();
            if (booking.UserId != GetCurrentUserId()) return Forbid();
            if (booking.Status != BookingStatus.Confirmed
                && booking.Status != BookingStatus.TestConfirmed
                && booking.Status != BookingStatus.Booked)
                return BadRequest(new GeneralResponse(false, "ההזמנה עדיין לא הונפקה.", Request.Path));

            var data = ParseBoardingData(booking);
            if (data == null)
                return BadRequest(new GeneralResponse(false, "חסרים נתוני עלייה למטוס.", Request.Path));

            try
            {
                var (bytes, fileName) = await _wallet.BuildApplePassAsync(id, data, ct);
                Response.Headers["Content-Disposition"] = $"inline; filename=\"{fileName}\"";
                Response.Headers["Cache-Control"] = "no-store";
                return File(bytes, "application/vnd.apple.pkpass");
            }
            catch (WalletNotConfiguredException ex)
            {
                _log_.LogError(ex, "Apple Wallet build failed for booking {Id}", id);
                return StatusCode(503, new GeneralResponse(
                    false,
                    "לא ניתן להוסיף ל‑Apple Wallet — חסר אישור Pass Type ID בשרת. פנו לתמיכה.",
                    Request.Path));
            }
        }

        /// <summary>
        /// Returns a Google Wallet save link for a booking. The frontend
        /// can either redirect or open it via the native bridge.
        /// </summary>
        [HttpGet("{id:int}/wallet-link/google")]
        public IActionResult GetGoogleWalletLink(int id)
        {
            var booking = _flights.GetEntityById(id);
            if (booking == null) return NotFound();
            if (booking.UserId != GetCurrentUserId()) return Forbid();
            if (booking.Status != BookingStatus.Confirmed
                && booking.Status != BookingStatus.TestConfirmed
                && booking.Status != BookingStatus.Booked)
                return BadRequest(new GeneralResponse(false, "ההזמנה עדיין לא הונפקה.", Request.Path));

            var data = ParseBoardingData(booking);
            if (data == null)
                return BadRequest(new GeneralResponse(false, "חסרים נתוני עלייה למטוס.", Request.Path));

            try
            {
                var url = _wallet.BuildGoogleWalletSaveLink(id, data);
                return Ok(new GeneralResponse(true, "Link generated.", Request.Path, new { url }));
            }
            catch (WalletNotConfiguredException ex)
            {
                _log_.LogError(ex, "Google Wallet link build failed for booking {Id}", id);
                return StatusCode(503, new GeneralResponse(
                    false,
                    "שירות Google Wallet אינו זמין כעת. נסו שוב מאוחר יותר או פנו לתמיכה.",
                    Request.Path));
            }
        }

        private static BoardingPassData? ParseBoardingData(FlightBooking booking)
        {
            if (string.IsNullOrWhiteSpace(booking.BoardingPassData)) return null;
            var opts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            try
            {
                // New shape: array of passes (multi-passenger). We always
                // return the primary (first) passenger's pass — wallet
                // generation and the trips-list summary only need one.
                var trimmed = booking.BoardingPassData.TrimStart();
                if (trimmed.StartsWith('['))
                {
                    var arr = JsonSerializer.Deserialize<List<BoardingPassData>>(
                        booking.BoardingPassData, opts);
                    return arr is { Count: > 0 } ? arr[0] : null;
                }
                // Legacy shape (pre-multi-passenger): a single object.
                return JsonSerializer.Deserialize<BoardingPassData>(
                    booking.BoardingPassData, opts);
            }
            catch
            {
                return null;
            }
        }
    }

    // Sanitized FlightBooking projection for the /Mine timeline. Mirrors
    // the frontend `Trip` shape; fields are nullable where BoardingPassData
    // may be missing (older rows or non-ticketed bookings).
    public record MineFlightBookingDto(
        int BookingId,
        string Status,
        string FlightNumber,
        string Carrier,
        string Origin,
        string OriginCity,
        string Destination,
        string DestinationCity,
        DateTime? DepartureUtc,
        DateTime? ArrivalUtc,
        string? Gate,
        string? Seat,
        string? Terminal,
        string? BookingReference,
        decimal? TotalCharged,
        string? Currency,
        int? Stops,
        string FlightStatus,
        bool IsUpcoming,
        DateTime CreatedAt
    );

    public class MineFlightBookingListResponse : GeneralResponse
    {
        public IEnumerable<MineFlightBookingDto> Items { get; }
        public MineFlightBookingListResponse(GeneralResponse parent, IEnumerable<MineFlightBookingDto> items)
            : base(parent)
        {
            Items = items;
        }
    }
}
