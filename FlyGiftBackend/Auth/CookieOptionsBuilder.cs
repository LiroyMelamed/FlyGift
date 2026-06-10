using Microsoft.AspNetCore.Http;

namespace FlyGiftBackend.Auth
{
    /// <summary>
    /// Single source of truth for the auth cookie. Reads
    /// `Auth:Cookie:*` config so production gets HttpOnly + Secure +
    /// SameSite=Strict while dev (cross-origin localhost) can fall back
    /// to SameSite=Lax over plain HTTP.
    /// </summary>
    public static class CookieOptionsBuilder
    {
        public const string DefaultCookieName = "flygift_token";

        public static string CookieName(IConfiguration cfg) =>
            cfg["Auth:Cookie:Name"] ?? DefaultCookieName;

        public static CookieOptions Build(IConfiguration cfg, DateTimeOffset expires)
        {
            var sameSiteRaw = cfg["Auth:Cookie:SameSite"] ?? "Strict";
            var sameSite = sameSiteRaw.Equals("None", StringComparison.OrdinalIgnoreCase)
                ? SameSiteMode.None
                : sameSiteRaw.Equals("Lax", StringComparison.OrdinalIgnoreCase)
                    ? SameSiteMode.Lax
                    : SameSiteMode.Strict;

            // Default to Secure in prod (we ship HTTPS), allow opt-out
            // in dev so localhost over HTTP still receives the cookie.
            var secure = !bool.TryParse(cfg["Auth:Cookie:Secure"], out var s) || s;
            var domain = cfg["Auth:Cookie:Domain"];

            return new CookieOptions
            {
                HttpOnly = true,
                Secure = secure,
                SameSite = sameSite,
                Expires = expires,
                Path = "/",
                Domain = string.IsNullOrWhiteSpace(domain) ? null : domain,
                IsEssential = true,
            };
        }

        public static CookieOptions ExpireImmediately(IConfiguration cfg)
        {
            var opts = Build(cfg, DateTimeOffset.UnixEpoch);
            return opts;
        }
    }
}
