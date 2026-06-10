using System.Text.RegularExpressions;

namespace FlyGiftBackend.Auth
{
    /// <summary>
    /// BCrypt helpers. Verification runs on a thread-pool thread so a slow
    /// hash doesn't block ASP.NET's request thread under load.
    /// </summary>
    public static partial class PasswordHasher
    {
        public const int WorkFactor = 10;

        private static readonly Regex CostRegex = CostPattern();

        public static Task<string> HashAsync(string password, CancellationToken ct = default) =>
            Task.Run(() => BCrypt.Net.BCrypt.HashPassword(password, WorkFactor), ct);

        public static Task<bool> VerifyAsync(string password, string hash, CancellationToken ct = default) =>
            Task.Run(
                () => !string.IsNullOrWhiteSpace(hash)
                      && BCrypt.Net.BCrypt.Verify(password, hash),
                ct);

        /// <summary>Parse the cost factor from a bcrypt hash, or null if unknown.</summary>
        public static int? ReadCost(string hash)
        {
            if (string.IsNullOrWhiteSpace(hash)) return null;
            var m = CostRegex.Match(hash);
            return m.Success && int.TryParse(m.Groups[1].Value, out var cost) ? cost : null;
        }

        public static bool NeedsRehash(string hash)
        {
            var cost = ReadCost(hash);
            return cost == null || cost > WorkFactor;
        }

        [GeneratedRegex(@"^\$2[aby]\$(\d{2})\$")]
        private static partial Regex CostPattern();
    }
}
