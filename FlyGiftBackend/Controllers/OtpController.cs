using System.Security.Claims;
using FlyGiftBackend.Data;
using FlyGiftBackend.Models;
using FlyGiftBackend.Services.Otp;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlyGiftBackend.Controllers
{
    /// <summary>
    /// Phone-number verification flow gating high-risk actions
    /// (gift redemption, settings changes). Stage 17.
    /// </summary>
    [ApiController]
    [Authorize]
    [Route("api/[controller]")]
    public class OtpController : ControllerBase
    {
        private readonly IOtpService _otp;
        private readonly AppDbContext _db;

        public OtpController(IOtpService otp, AppDbContext db)
        {
            _otp = otp;
            _db = db;
        }

        private int GetCurrentUserId() =>
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        public class SendOtpRequest
        {
            public string Purpose { get; set; } = "redeem";
            /// <summary>If null, uses the user's stored PhoneNumber.</summary>
            public string? Phone { get; set; }
        }

        public class VerifyOtpRequest
        {
            public string Purpose { get; set; } = "redeem";
            public string Code { get; set; } = "";
        }

        [HttpPost("Send")]
        public async Task<IActionResult> Send([FromBody] SendOtpRequest req, CancellationToken ct)
        {
            var userId = GetCurrentUserId();
            var user = await _db.Users.FindAsync(new object?[] { userId }, ct);
            if (user == null)
                return NotFound(new GeneralResponse(false, "User not found.", Request.Path));

            var phone = req.Phone ?? user.PhoneNumber;
            if (string.IsNullOrWhiteSpace(phone))
                return BadRequest(new GeneralResponse(false, "No phone number on file. Provide one in the request body.", Request.Path));

            // Stash unverified phone so Verify can persist it on success.
            if (!string.Equals(user.PhoneNumber, phone, StringComparison.Ordinal))
            {
                user.PhoneNumber = phone;
                user.PhoneVerified = false;
                await _db.SaveChangesAsync(ct);
            }

            var result = await _otp.IssueAsync(req.Purpose, userId, phone, ct);
            if (!result.Success)
                return BadRequest(new GeneralResponse(false, result.FailureReason ?? "Failed to send code.", Request.Path));

            return Ok(new GeneralResponse(true, "Code sent.", Request.Path, new
            {
                phoneMasked = MaskPhone(phone),
                expiresAt = result.ExpiresAt,
            }));
        }

        [HttpPost("Verify")]
        public async Task<IActionResult> Verify([FromBody] VerifyOtpRequest req, CancellationToken ct)
        {
            var userId = GetCurrentUserId();
            var result = await _otp.VerifyAsync(req.Purpose, userId, req.Code, ct);
            if (!result.Success)
            {
                return BadRequest(new GeneralResponse(false,
                    result.FailureReason ?? "Verification failed.",
                    Request.Path,
                    new { remainingAttempts = result.RemainingAttempts }));
            }

            var user = await _db.Users.FindAsync(new object?[] { userId }, ct);
            if (user != null && !user.PhoneVerified)
            {
                user.PhoneVerified = true;
                await _db.SaveChangesAsync(ct);
            }
            return Ok(new GeneralResponse(true, "Verified.", Request.Path));
        }

        private static string MaskPhone(string phone)
        {
            if (phone.Length <= 4) return new string('•', phone.Length);
            return new string('•', phone.Length - 4) + phone[^4..];
        }
    }
}
