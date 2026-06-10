using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FlyGiftBackend.Controllers
{
    /// <summary>
    /// Lightweight liveness probe for nginx / monitoring. Anonymous so
    /// uptime checks don't need credentials.
    /// </summary>
    [ApiController]
    [AllowAnonymous]
    [Route("api/[controller]")]
    public class HealthController : ControllerBase
    {
        [HttpGet]
        public IActionResult Get() =>
            Ok(new { status = "ok", utc = DateTime.UtcNow });
    }
}
