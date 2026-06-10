using FlyGiftBackend.Models;
using FlyGiftBackend.Services.Flights;
using FlyGiftBackend.Services.Flights.Kiwi;
using Microsoft.AspNetCore.Mvc;

namespace FlyGiftBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FlightSearchController : ControllerBase
    {
        private readonly IFlightSearchService _search;
        private readonly KiwiOptions _kiwiOpts;
        private readonly IHttpClientFactory _httpFactory;
        private readonly ILogger<FlightSearchController> _log;

        public FlightSearchController(
            IFlightSearchService search,
            Microsoft.Extensions.Options.IOptions<KiwiOptions> kiwiOpts,
            IHttpClientFactory httpFactory,
            ILogger<FlightSearchController> log)
        {
            _search = search;
            _kiwiOpts = kiwiOpts.Value;
            _httpFactory = httpFactory;
            _log = log;
        }

        /// <summary>Search flight offers across all configured providers.</summary>
        [HttpPost]
        public async Task<IActionResult> Search(
            [FromBody] FlightSearchRequest request, CancellationToken ct)
        {
            try
            {
                var result = await _search.SearchAsync(request, ct);
                return Ok(new GeneralResponse(true, "Search complete.", Request.Path, result));
            }
            catch (InvalidOperationException ex)
            {
                // User-facing validation (past date, same origin/dest, etc.)
                return BadRequest(new GeneralResponse(false, ex.Message, Request.Path));
            }
            catch (KiwiApiException ex)
            {
                // Upstream Tequila failure — translate to Hebrew so the UI
                // doesn't have to know provider-specific error codes.
                _log.LogWarning(ex, "Tequila search failed: code={Code} status={Status}", ex.Code, ex.StatusCode);
                var heb = TranslateKiwiError(ex);
                return StatusCode(502, new GeneralResponse(false, heb, Request.Path));
            }
            catch (TaskCanceledException) when (ct.IsCancellationRequested)
            {
                throw; // client cancellation — do not log as an error
            }
            catch (TaskCanceledException ex)
            {
                _log.LogWarning(ex, "Flight provider timed out.");
                return StatusCode(504, new GeneralResponse(
                    false, "החיפוש לוקח יותר מדי זמן. נסו שוב בעוד רגע.", Request.Path));
            }
            catch (HttpRequestException ex)
            {
                _log.LogError(ex, "Network failure calling flight provider.");
                return StatusCode(502, new GeneralResponse(
                    false, "שירות חיפוש הטיסות אינו זמין כעת. נסו שוב בעוד רגע.", Request.Path));
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "Unexpected flight search failure.");
                return StatusCode(500, new GeneralResponse(
                    false, "שגיאה לא צפויה בחיפוש הטיסות.", Request.Path));
            }
        }

        /// <summary>
        /// Connectivity smoke test. Hits Tequila <c>/v2/search</c> with a
        /// trivial TLV→CDG query and returns whether the configured API key
        /// is accepted. Use to verify deployment wiring without going through
        /// the full search/booking flow.
        /// </summary>
        [HttpGet("ping")]
        [Microsoft.AspNetCore.Authorization.AllowAnonymous]
        public async Task<IActionResult> Ping(CancellationToken ct)
        {
            if (!_kiwiOpts.IsConfigured)
            {
                return Ok(new
                {
                    provider = "Mock",
                    configured = false,
                    message = "No Tequila API key configured — running mock provider.",
                });
            }

            try
            {
                using var http = _httpFactory.CreateClient();
                http.DefaultRequestHeaders.Add("apikey", _kiwiOpts.ApiKey);
                var probeDate = DateTime.UtcNow.AddDays(14).ToString("dd/MM/yyyy",
                    System.Globalization.CultureInfo.InvariantCulture);
                var url =
                    $"{_kiwiOpts.BaseUrl.TrimEnd('/')}/v2/search?fly_from=TLV&fly_to=CDG" +
                    $"&date_from={probeDate}&date_to={probeDate}&curr={_kiwiOpts.Currency}&limit=1";

                using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                cts.CancelAfter(TimeSpan.FromSeconds(8));
                using var resp = await http.GetAsync(url, cts.Token);

                return Ok(new
                {
                    provider = "Kiwi.com Tequila",
                    mode = _kiwiOpts.Mode,
                    configured = true,
                    statusCode = (int)resp.StatusCode,
                    success = resp.IsSuccessStatusCode,
                    message = resp.IsSuccessStatusCode
                        ? "Connection Success"
                        : $"Tequila returned HTTP {(int)resp.StatusCode}.",
                });
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "Tequila ping failed.");
                return StatusCode(502, new
                {
                    provider = "Kiwi.com Tequila",
                    configured = true,
                    success = false,
                    message = ex.Message,
                });
            }
        }

        /// <summary>IATA airport autocomplete for the search inputs.</summary>
        [HttpGet("airports")]
        public ActionResult<GeneralResponse> Airports([FromQuery] string? q, [FromQuery] int limit = 10)
        {
            var matches = AirportDirectory.Search(q ?? "", Math.Clamp(limit, 1, 50));
            return Ok(new GeneralResponse(true, "OK", Request.Path, matches));
        }

        /// <summary>
        /// Map common Tequila error codes / HTTP statuses to Hebrew. Falls back
        /// to a generic Hebrew sentence so the user never sees raw English.
        /// Reference: https://tequila.kiwi.com/portal/docs/tequila_api/search_api
        /// </summary>
        private static string TranslateKiwiError(KiwiApiException ex)
        {
            // Tequila signals "no flights" with HTTP 200 + empty data array,
            // not an error code, so we don't need to handle that case here.
            return ex.StatusCode switch
            {
                400 => "פרטי החיפוש אינם תקינים. בדקו את שדה המוצא, היעד והתאריכים.",
                401 or 403 => "תקלת הרשאה מול ספק הטיסות. צרו קשר עם התמיכה.",
                404 => "צמד המוצא והיעד אינו נתמך עבור התאריכים שנבחרו.",
                422 => "פרטי החיפוש אינם תקינים. בדקו את שדה המוצא, היעד והתאריכים.",
                429 => "מערכת החיפוש עמוסה כעת. נסו שוב בעוד מספר שניות.",
                >= 500 => "ספק הטיסות אינו זמין כעת. נסו שוב בעוד רגע.",
                _ => "החיפוש נכשל. בדקו את פרטי החיפוש ונסו שוב.",
            };
        }
    }
}


