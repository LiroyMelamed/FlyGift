using System.Security.Claims;
using System.Text.Json;
using FlyGiftBackend.Models;
using FlyGiftBackend.Repositories;
using FlyGiftBackend.Services;
using FlyGiftBackend.Services.Booking;
using FlyGiftBackend.Services.Wallet;
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

        public BookingsController(
            FlightBookingRepository flights,
            IWalletService wallet,
            IBookingService booking,
            IIdempotencyService idem)
        {
            _flights = flights;
            _wallet = wallet;
            _booking = booking;
            _idem = idem;
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
                    return BadRequest(new GeneralResponse(false, "Idempotency-Key too long.", Request.Path));

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
                return Ok(new GeneralResponse(true, "Flight booked.", Request.Path, result));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new GeneralResponse(false, ex.Message, Request.Path));
            }
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
            if (booking.Status != BookingStatus.Booked)
                return BadRequest(new GeneralResponse(false, "Booking is not ticketed yet.", Request.Path));

            var data = ParseBoardingData(booking);
            if (data == null)
                return BadRequest(new GeneralResponse(false, "Boarding data missing.", Request.Path));

            var (bytes, fileName) = await _wallet.BuildApplePassAsync(id, data, ct);
            return File(bytes, "application/vnd.apple.pkpass", fileName);
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
            if (booking.Status != BookingStatus.Booked)
                return BadRequest(new GeneralResponse(false, "Booking is not ticketed yet.", Request.Path));

            var data = ParseBoardingData(booking);
            if (data == null)
                return BadRequest(new GeneralResponse(false, "Boarding data missing.", Request.Path));

            var url = _wallet.BuildGoogleWalletSaveLink(id, data);
            return Ok(new GeneralResponse(true, "Link generated.", Request.Path, new { url }));
        }

        private static BoardingPassData? ParseBoardingData(FlightBooking booking)
        {
            if (string.IsNullOrWhiteSpace(booking.BoardingPassData)) return null;
            try
            {
                return JsonSerializer.Deserialize<BoardingPassData>(
                    booking.BoardingPassData,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
            catch
            {
                return null;
            }
        }
    }
}
