using FlyGiftBackend.Models;
using FlyGiftBackend.Services.Flights;
using Microsoft.AspNetCore.Mvc;

namespace FlyGiftBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FlightSearchController : ControllerBase
    {
        private readonly IFlightSearchService _search;

        public FlightSearchController(IFlightSearchService search) => _search = search;

        /// <summary>Search flight offers across all configured providers.</summary>
        [HttpPost]
        public async Task<ActionResult<GeneralResponse>> Search(
            [FromBody] FlightSearchRequest request, CancellationToken ct)
        {
            try
            {
                var result = await _search.SearchAsync(request, ct);
                return Ok(new GeneralResponse(true, "Search complete.", Request.Path, result));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new GeneralResponse(false, ex.Message, Request.Path));
            }
        }

        /// <summary>IATA airport autocomplete for the search inputs.</summary>
        [HttpGet("airports")]
        public ActionResult<GeneralResponse> Airports([FromQuery] string? q, [FromQuery] int limit = 10)
        {
            var matches = AirportDirectory.Search(q ?? "", Math.Clamp(limit, 1, 50));
            return Ok(new GeneralResponse(true, "OK", Request.Path, matches));
        }
    }
}
