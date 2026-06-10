using System.Security.Claims;
using FlyGiftBackend.Models;
using FlyGiftBackend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FlyGiftBackend.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/[controller]")]
    public class AppController : ControllerBase
    {
        private readonly IAppBootstrapService _bootstrap;

        public AppController(IAppBootstrapService bootstrap) => _bootstrap = bootstrap;

        private int GetCurrentUserId() =>
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        /// <summary>
        /// Single boot payload — profile, recent transactions, gift cards,
        /// and bookings in one parallel DB round-trip.
        /// </summary>
        [HttpGet("Bootstrap")]
        public async Task<ActionResult<GeneralResponse>> Bootstrap(CancellationToken ct)
        {
            try
            {
                var payload = await _bootstrap.LoadAsync(GetCurrentUserId(), ct);
                return Ok(new GeneralResponse(true, "OK", Request.Path, payload));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new GeneralResponse(
                    false, "Internal Server Error: " + ex.Message, Request.Path));
            }
        }
    }
}
