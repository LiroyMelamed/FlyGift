using FlyGiftBackend.Services.Messaging;

namespace FlyGiftBackend.Services.Bulk
{
    /// <summary>
    /// Adapter for transactional notifications. Delegates to
    /// <see cref="IMessagingProvider"/> so we keep one templated send path.
    /// </summary>
    public interface INotificationService
    {
        Task SendGiftEmailAsync(string to, string recipientName, string code, decimal amount, string currency, string? companyName = null, CancellationToken ct = default);
        Task SendGiftSmsAsync(string toPhone, string recipientName, string code, decimal amount, string currency, string? companyName = null, CancellationToken ct = default);
    }

    public class TemplatedNotificationService : INotificationService
    {
        private readonly IMessagingProvider _msg;
        private readonly ILogger<TemplatedNotificationService> _log;

        public TemplatedNotificationService(IMessagingProvider msg, ILogger<TemplatedNotificationService> log)
        {
            _msg = msg;
            _log = log;
        }

        public Task SendGiftEmailAsync(string to, string recipientName, string code, decimal amount, string currency, string? companyName = null, CancellationToken ct = default)
        {
            return _msg.SendEmailAsync("gift.received.email", to, BuildVars(recipientName, code, amount, currency, companyName), ct);
        }

        public Task SendGiftSmsAsync(string toPhone, string recipientName, string code, decimal amount, string currency, string? companyName = null, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(toPhone)) return Task.CompletedTask;
            return _msg.SendSmsAsync("gift.received.sms", toPhone, BuildVars(recipientName, code, amount, currency, companyName), ct);
        }

        private static Dictionary<string, string?> BuildVars(string name, string code, decimal amount, string currency, string? company) => new()
        {
            ["Name"] = name,
            ["Code"] = code,
            ["Amount"] = amount.ToString("0.00"),
            ["Currency"] = currency,
            ["Company"] = company ?? "FlyGift",
            ["ClaimUrl"] = $"https://flygift.app/redeem/{code}",
        };
    }
}
