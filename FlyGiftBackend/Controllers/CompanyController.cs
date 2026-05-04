using System.Security.Claims;
using FlyGiftBackend.Models;
using FlyGiftBackend.Services;
using FlyGiftBackend.Services.Bulk;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FlyGiftBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = nameof(UserRole.Company) + "," + nameof(UserRole.Admin))]
    public class CompanyController : ControllerBase
    {
        private const long MaxFileSizeBytes = 5 * 1024 * 1024; // 5 MB
        private static readonly string[] AllowedContentTypes =
        {
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel",
            "application/octet-stream",
        };

        private readonly IBulkGiftCardService _bulk;
        private readonly IIdempotencyService _idem;

        public CompanyController(IBulkGiftCardService bulk, IIdempotencyService idem)
        {
            _bulk = bulk;
            _idem = idem;
        }

        private int GetCurrentUserId() =>
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        /// <summary>
        /// Step 1 — upload + parse. Returns a preview for the UI to confirm.
        /// </summary>
        [HttpPost("BulkUpload/Preview")]
        [RequestSizeLimit(MaxFileSizeBytes)]
        public async Task<IActionResult> PreviewBulkUpload(
            IFormFile file,
            CancellationToken ct)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new GeneralResponse(false, "No file uploaded.", Request.Path));
            if (file.Length > MaxFileSizeBytes)
                return BadRequest(new GeneralResponse(false, "File too large (max 5MB).", Request.Path));
            if (!AllowedContentTypes.Contains(file.ContentType))
                return BadRequest(new GeneralResponse(false, "Only .xlsx files are accepted.", Request.Path));

            try
            {
                await using var stream = file.OpenReadStream();
                var preview = await _bulk.PreviewAsync(stream, ct);

                return Ok(new GeneralResponse(true, "Preview generated.", Request.Path, preview));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new GeneralResponse(false, ex.Message, Request.Path));
            }
        }

        /// <summary>
        /// Step 2 — confirm + dispatch. Re-uploads the file (stateless) and
        /// commits the batch atomically. Idempotent via Idempotency-Key header.
        /// </summary>
        [HttpPost("BulkUpload/Confirm")]
        [RequestSizeLimit(MaxFileSizeBytes)]
        public async Task<IActionResult> ConfirmBulkUpload(
            IFormFile file,
            [FromForm] string defaultCurrency = "USD",
            [FromForm] DateTime? expirationDate = null,
            CancellationToken ct = default)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new GeneralResponse(false, "No file uploaded.", Request.Path));

            var companyUserId = GetCurrentUserId();
            var idemKey = Request.Headers["Idempotency-Key"].ToString();

            if (!string.IsNullOrWhiteSpace(idemKey) &&
                _idem.TryGet<BulkDispatchResult>("company.bulk", companyUserId, idemKey, out var cached) &&
                cached != null)
            {
                Response.Headers["Idempotent-Replay"] = "true";
                return Ok(new GeneralResponse(true, "Idempotent replay.", Request.Path, cached));
            }

            try
            {
                await using var stream = file.OpenReadStream();
                var parsed = await _bulk.PreviewAsync(stream, ct);

                var result = await _bulk.ConfirmAsync(companyUserId, parsed, new BulkConfirmRequest
                {
                    DefaultCurrency = defaultCurrency,
                    ExpirationDate = expirationDate,
                }, ct);

                if (!string.IsNullOrWhiteSpace(idemKey))
                    _idem.Save("company.bulk", companyUserId, idemKey, result);

                return Ok(new GeneralResponse(true,
                    $"Batch dispatched ({result.SucceededRows}/{result.TotalRows}).",
                    Request.Path, result));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new GeneralResponse(false, ex.Message, Request.Path));
            }
            catch (Exception ex)
            {
                return StatusCode(500,
                    new GeneralResponse(false, "Bulk upload failed: " + ex.Message, Request.Path));
            }
        }
    }
}
