using System.Security.Claims;
using FlyGiftBackend.Models;
using FlyGiftBackend.Services.Hotels;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FlyGiftBackend.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/[controller]")]
    public class HotelSearchController : ControllerBase
    {
        private readonly IHotelSearchService _hotels;

        public HotelSearchController(IHotelSearchService hotels) => _hotels = hotels;

        private int GetCurrentUserId() =>
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        /// <summary>
        /// GET /api/HotelSearch?city=...&checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD&guests=2
        /// Returns hotel offers tagged with affordability against the
        /// caller's wallet balance.
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<GeneralResponse>> Search(
            [FromQuery] string city,
            [FromQuery] DateTime checkIn,
            [FromQuery] DateTime checkOut,
            [FromQuery] int guests = 2,
            [FromQuery] decimal? maxNightlyRate = null,
            CancellationToken ct = default)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _hotels.SearchAsync(userId, new HotelSearchRequest
                {
                    City = city,
                    CheckIn = checkIn,
                    CheckOut = checkOut,
                    Guests = guests,
                    MaxNightlyRate = maxNightlyRate,
                }, ct);
                return Ok(new GeneralResponse(true, "Search complete.", Request.Path, result));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new GeneralResponse(false, ex.Message, Request.Path));
            }
        }

        /// <summary>POST /api/HotelSearch/Book — split-payment booking.</summary>
        [HttpPost("Book")]
        public async Task<ActionResult<GeneralResponse>> Book(
            [FromBody] BookHotelRequest request, CancellationToken ct)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _hotels.BookAsync(userId, request, ct);
                return Ok(new GeneralResponse(true, "Hotel booked.", Request.Path, result));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new GeneralResponse(false, ex.Message, Request.Path));
            }
        }
    }
}
