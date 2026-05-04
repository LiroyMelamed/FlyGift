using System.Security.Cryptography;
using FlyGiftBackend.Services.Messaging;
using Microsoft.Extensions.Caching.Memory;

namespace FlyGiftBackend.Services.Otp
{
    public class OtpOptions
    {
        public int CodeLength { get; set; } = 6;
        public int TtlMinutes { get; set; } = 5;
        public int MaxAttempts { get; set; } = 5;
    }

    public class OtpIssueResult
    {
        public bool Success { get; set; }
        public DateTime ExpiresAt { get; set; }
        public string? FailureReason { get; set; }
    }

    public class OtpVerifyResult
    {
        public bool Success { get; set; }
        public int RemainingAttempts { get; set; }
        public string? FailureReason { get; set; }
    }

    /// <summary>
    /// Issues + verifies short-lived numeric codes. Default impl is in-memory
    /// (suitable for single-instance dev). Swap for a Redis-backed impl in
    /// horizontally scaled production deployments.
    /// </summary>
    public interface IOtpService
    {
        Task<OtpIssueResult> IssueAsync(string purpose, int userId, string toPhone, CancellationToken ct = default);
        Task<OtpVerifyResult> VerifyAsync(string purpose, int userId, string code, CancellationToken ct = default);
    }

    public class MemoryOtpService : IOtpService
    {
        private readonly IMemoryCache _cache;
        private readonly IMessagingProvider _msg;
        private readonly OtpOptions _opts;
        private readonly ILogger<MemoryOtpService> _log;

        public MemoryOtpService(
            IMemoryCache cache,
            IMessagingProvider msg,
            Microsoft.Extensions.Options.IOptions<OtpOptions> opts,
            ILogger<MemoryOtpService> log)
        {
            _cache = cache;
            _msg = msg;
            _opts = opts.Value;
            _log = log;
        }

        public async Task<OtpIssueResult> IssueAsync(string purpose, int userId, string toPhone, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(toPhone))
                return new OtpIssueResult { Success = false, FailureReason = "Phone number required." };

            var code = GenerateCode(_opts.CodeLength);
            var expiresAt = DateTime.UtcNow.AddMinutes(_opts.TtlMinutes);
            var entry = new OtpEntry { Code = code, ExpiresAt = expiresAt, AttemptsLeft = _opts.MaxAttempts };

            _cache.Set(KeyFor(purpose, userId), entry, expiresAt);

            var result = await _msg.SendSmsAsync("otp.sms", toPhone, new Dictionary<string, string?>
            {
                ["Code"] = code,
                ["Minutes"] = _opts.TtlMinutes.ToString(),
            }, ct);

            if (!result.Success)
            {
                _cache.Remove(KeyFor(purpose, userId));
                return new OtpIssueResult { Success = false, FailureReason = result.FailureReason ?? "SMS provider failed." };
            }

            return new OtpIssueResult { Success = true, ExpiresAt = expiresAt };
        }

        public Task<OtpVerifyResult> VerifyAsync(string purpose, int userId, string code, CancellationToken ct = default)
        {
            var key = KeyFor(purpose, userId);
            if (!_cache.TryGetValue<OtpEntry>(key, out var entry) || entry == null)
            {
                return Task.FromResult(new OtpVerifyResult { Success = false, FailureReason = "No code issued or it expired." });
            }

            entry.AttemptsLeft--;
            if (entry.AttemptsLeft <= 0)
            {
                _cache.Remove(key);
                return Task.FromResult(new OtpVerifyResult { Success = false, RemainingAttempts = 0, FailureReason = "Too many attempts." });
            }

            if (!CryptographicOperations.FixedTimeEquals(
                    System.Text.Encoding.UTF8.GetBytes(entry.Code),
                    System.Text.Encoding.UTF8.GetBytes(code ?? "")))
            {
                _cache.Set(key, entry, entry.ExpiresAt);
                return Task.FromResult(new OtpVerifyResult { Success = false, RemainingAttempts = entry.AttemptsLeft, FailureReason = "Incorrect code." });
            }

            _cache.Remove(key);
            return Task.FromResult(new OtpVerifyResult { Success = true });
        }

        private static string KeyFor(string purpose, int userId) => $"otp:{purpose}:{userId}";

        private static string GenerateCode(int len)
        {
            Span<byte> buf = stackalloc byte[4];
            RandomNumberGenerator.Fill(buf);
            var n = BitConverter.ToUInt32(buf) % (uint)Math.Pow(10, len);
            return n.ToString(new string('0', len));
        }

        private class OtpEntry
        {
            public string Code { get; set; } = "";
            public DateTime ExpiresAt { get; set; }
            public int AttemptsLeft { get; set; }
        }
    }
}
