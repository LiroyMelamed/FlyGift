using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using FlyGiftBackend.Auth;
using FlyGiftBackend.Models;
using FlyGiftBackend.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;

namespace FlyGiftBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AuthRepository users;
        private readonly IConfiguration _config;

        public AuthController(AuthRepository users, IConfiguration config)
        {
            this.users = users;
            _config = config;
        }

        [AllowAnonymous]
        [HttpPost("Register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken ct)
        {
            try
            {
                // RegisterRequest carries [Required] / [StringLength] so
                // [ApiController] auto-rejects malformed bodies with a 400
                // before we get here. Any extra contract validation that
                // depends on multiple fields lives below.
                var fullName = request.FullName?.Trim() ?? "";
                if (string.IsNullOrWhiteSpace(fullName))
                {
                    return BadRequest(new GeneralResponse(false, "שם מלא הוא שדה חובה.", HttpContext.Request.Path));
                }

                var hashedPassword = await PasswordHasher.HashAsync(request.PasswordHash, ct);

                var checkUserName = await users.GetUserByUsernameAsync(request.Username, ct);
                if (checkUserName != null)
                {
                    return Conflict(new GeneralResponse(false, "שם המשתמש כבר תפוס.", HttpContext.Request.Path));
                }

                // Split "Liroy Melamed" → FirstName="Liroy", LastName="Melamed".
                // We require non-empty first name (validated above); last
                // name remains optional for single-token cultures/handles.
                var parts = fullName.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
                var firstName = parts[0];
                var lastName = parts.Length > 1 ? parts[1] : null;

                var user = new User
                {
                    UserName = request.Username,
                    PasswordHash = hashedPassword,
                    Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim(),
                    FirstName = firstName,
                    LastName = lastName,
                    Role = request.Role,
                    CreatedAt = DateTime.UtcNow,
                };

                users.Add(user);
                users.Update(user);

                return Ok(new GeneralResponse(true, "החשבון נוצר בהצלחה.", HttpContext.Request.Path));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new GeneralResponse(false, "Internal Server Error: " + ex.Message, HttpContext.Request.Path));
            }
        }


        [AllowAnonymous]
        [HttpPost("Login")]
        public async Task<UserResponse> Login([FromBody] LoginRequest request, CancellationToken ct)
        {
            try
            {
                var user = await users.GetUserByUsernameAsync(request.Username, ct);

                if (user == null || !await PasswordHasher.VerifyAsync(request.PasswordHash, user.PasswordHash, ct))
                {
                    return new UserResponse(new GeneralResponse(false, "Invalid username or password.", HttpContext.Request.Path), null);
                }

                // Downgrade legacy high-cost bcrypt hashes on successful login.
                if (PasswordHasher.NeedsRehash(user.PasswordHash))
                {
                    user.PasswordHash = await PasswordHasher.HashAsync(request.PasswordHash, ct);
                    users.Update(user);
                }

                var token = GenerateJwtToken(user);

                // Set the JWT as an HttpOnly cookie so JavaScript can never
                // read it (XSS-resistant). Browser will send it automatically
                // on every same-site request — frontend uses `withCredentials`
                // for cross-origin during dev. Token is still returned in the
                // body for native/mobile clients that don't have cookie jars.
                var minutes = Convert.ToInt32(_config["JwtSettings:ExpirationInMinutes"]);
                HttpContext.Response.Cookies.Append(
                    CookieOptionsBuilder.CookieName(_config),
                    token,
                    CookieOptionsBuilder.Build(_config, DateTimeOffset.UtcNow.AddMinutes(minutes)));

                return new UserResponse(new GeneralResponse(true, "Login successful!", HttpContext.Request.Path, token), user);
            }
            catch (Exception ex)
            {
                return new UserResponse(new GeneralResponse(false, "Internal Server Error: " + ex.Message, HttpContext.Request.Path), null);
            }
        }

        /// <summary>Clear the auth cookie on the browser side.</summary>
        [AllowAnonymous]
        [HttpPost("Logout")]
        public IActionResult Logout()
        {
            HttpContext.Response.Cookies.Delete(
                CookieOptionsBuilder.CookieName(_config),
                CookieOptionsBuilder.ExpireImmediately(_config));
            return Ok(new GeneralResponse(true, "Logged out.", HttpContext.Request.Path));
        }

        /// <summary>Returns the signed-in user's editable profile fields.</summary>
        [Authorize]
        [HttpGet("Me")]
        public IActionResult Me()
        {
            var user = GetCurrentUser();
            if (user == null)
                return NotFound(new GeneralResponse(false, "המשתמש לא נמצא.", HttpContext.Request.Path));
            return Ok(new GeneralResponse(true, "OK", HttpContext.Request.Path, UserProfileDto.From(user)));
        }

        /// <summary>Updates name, email, and phone for the signed-in user.</summary>
        [Authorize]
        [HttpPut("Profile")]
        public IActionResult UpdateProfile([FromBody] UpdateProfileRequest request)
        {
            var user = GetCurrentUser();
            if (user == null)
                return NotFound(new GeneralResponse(false, "המשתמש לא נמצא.", HttpContext.Request.Path));

            var fullName = request.FullName?.Trim() ?? "";
            if (string.IsNullOrWhiteSpace(fullName))
                return BadRequest(new GeneralResponse(false, "שם מלא הוא שדה חובה.", HttpContext.Request.Path));

            var email = request.Email?.Trim();
            if (string.IsNullOrWhiteSpace(email))
                return BadRequest(new GeneralResponse(false, "דוא\"ל הוא שדה חובה.", HttpContext.Request.Path));

            try
            {
                FlyGiftBackend.Services.Flights.Kiwi.KiwiFlightBookingProvider.ValidateBookingEmail(email);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new GeneralResponse(false, ex.Message, HttpContext.Request.Path));
            }

            var parts = fullName.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
            user.FirstName = parts[0];
            user.LastName = parts.Length > 1 ? parts[1] : null;
            user.Email = email;
            user.PhoneNumber = NormalizePhone(request.PhoneNumber);

            users.Update(user);
            return Ok(new GeneralResponse(true, "הפרופיל עודכן.", HttpContext.Request.Path, UserProfileDto.From(user)));
        }

        private User? GetCurrentUser()
        {
            var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(raw) || !int.TryParse(raw, out var userId))
                return null;
            return users.GetEntityById(userId);
        }

        private static string? NormalizePhone(string? phone)
        {
            if (string.IsNullOrWhiteSpace(phone))
                return null;

            var digits = new string(phone.Where(c => char.IsDigit(c) || c == '+').ToArray());
            if (digits.StartsWith("00", StringComparison.Ordinal))
                digits = "+" + digits[2..];
            if (!digits.StartsWith('+'))
                digits = digits.StartsWith('0') ? "+972" + digits.TrimStart('0') : "+" + digits;

            return digits.Length >= 9 ? digits : null;
        }

        private string GenerateJwtToken(User user)
        {
            var key = Encoding.UTF8.GetBytes(_config["JwtSettings:Secret"]);
            var displayName = string.IsNullOrWhiteSpace(user.FirstName)
                ? user.UserName
                : (string.IsNullOrWhiteSpace(user.LastName)
                    ? user.FirstName
                    : $"{user.FirstName} {user.LastName}");
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, displayName),
                new Claim(ClaimTypes.Role, user.Role.ToString())
            };

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddMinutes(Convert.ToInt32(_config["JwtSettings:ExpirationInMinutes"])),
                Issuer = _config["JwtSettings:Issuer"],
                Audience = _config["JwtSettings:Audience"],
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256)
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }
    }

    public class RegisterRequest
    {
        [Required(ErrorMessage = "שם משתמש הוא שדה חובה.")]
        [StringLength(50, MinimumLength = 3, ErrorMessage = "שם המשתמש חייב להיות בין 3 ל-50 תווים.")]
        public string Username { get; set; } = string.Empty;

        // Plain-text password from the client. Re-hashed server-side with
        // BCrypt; the property name is historical (the DB column it lands
        // in is User.PasswordHash).
        [Required(ErrorMessage = "סיסמה היא שדה חובה.")]
        [StringLength(100, MinimumLength = 6, ErrorMessage = "סיסמה חייבת להיות באורך של לפחות 6 תווים.")]
        public string PasswordHash { get; set; } = string.Empty;

        // Required end-to-end (frontend form + DTO + controller). Split
        // into FirstName/LastName at insert time. Single-token names land
        // in FirstName only.
        [Required(ErrorMessage = "שם מלא הוא שדה חובה.")]
        [StringLength(100, MinimumLength = 2, ErrorMessage = "שם מלא חייב להיות באורך של לפחות 2 תווים.")]
        public string FullName { get; set; } = string.Empty;

        [EmailAddress(ErrorMessage = "כתובת מייל לא תקינה.")]
        public string? Email { get; set; }

        // Defaults to Client when omitted from the JSON payload (the
        // enum's zero value).
        public UserRole Role { get; set; } = UserRole.Client;
    }

    public class LoginRequest
    {
        public string Username { get; set; }
        public string PasswordHash { get; set; }
    }

    public class UpdateProfileRequest
    {
        [Required(ErrorMessage = "שם מלא הוא שדה חובה.")]
        public string FullName { get; set; } = "";

        [Required(ErrorMessage = "דוא\"ל הוא שדה חובה.")]
        [EmailAddress(ErrorMessage = "כתובת מייל לא תקינה.")]
        public string Email { get; set; } = "";

        public string? PhoneNumber { get; set; }
    }
}
