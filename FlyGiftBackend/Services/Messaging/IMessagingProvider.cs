using System.Text.RegularExpressions;

namespace FlyGiftBackend.Services.Messaging
{
    public class EmailMessage
    {
        public string To { get; set; } = "";
        public string? ToName { get; set; }
        public string Subject { get; set; } = "";
        public string Body { get; set; } = "";
        public bool IsHtml { get; set; } = true;
    }

    public class SmsMessage
    {
        /// <summary>E.164 format, e.g. +14155552671</summary>
        public string ToPhone { get; set; } = "";
        public string Body { get; set; } = "";
    }

    public class MessageDeliveryResult
    {
        public bool Success { get; set; }
        public string? ProviderMessageId { get; set; }
        public string? FailureReason { get; set; }
    }

    /// <summary>
    /// Single channel-agnostic outbound surface. Inject the appropriate
    /// implementation (SendGrid / Twilio / Mock) via DI.
    /// </summary>
    public interface IEmailProvider
    {
        Task<MessageDeliveryResult> SendAsync(EmailMessage msg, CancellationToken ct = default);
    }

    public interface ISmsProvider
    {
        Task<MessageDeliveryResult> SendAsync(SmsMessage msg, CancellationToken ct = default);
    }

    /// <summary>
    /// Aggregates email + sms + templating so callers don't have to know
    /// which channel they're talking to.
    /// </summary>
    public interface IMessagingProvider
    {
        Task<MessageDeliveryResult> SendEmailAsync(string templateId, string to, IDictionary<string, string?> vars, CancellationToken ct = default);
        Task<MessageDeliveryResult> SendSmsAsync(string templateId, string toPhone, IDictionary<string, string?> vars, CancellationToken ct = default);
    }

    /// <summary>{Variable} substitution — keep deliberately tiny so we can swap for Liquid/Razor later.</summary>
    public interface ITemplateEngine
    {
        string Render(string template, IDictionary<string, string?> vars);
    }

    public class SimpleTemplateEngine : ITemplateEngine
    {
        private static readonly Regex Token = new(@"\{(?<key>[A-Za-z0-9_]+)\}", RegexOptions.Compiled);

        public string Render(string template, IDictionary<string, string?> vars)
        {
            if (string.IsNullOrEmpty(template)) return template ?? "";
            return Token.Replace(template, m =>
            {
                var key = m.Groups["key"].Value;
                return vars.TryGetValue(key, out var v) && v != null ? v : "";
            });
        }
    }

    /// <summary>Catalog of named templates; in prod swap for DB-backed lookup.</summary>
    public interface ITemplateCatalog
    {
        bool TryGet(string templateId, out MessageTemplate? template);
    }

    public class MessageTemplate
    {
        public string Id { get; set; } = "";
        public string? Subject { get; set; }
        public string Body { get; set; } = "";
    }

    public class InMemoryTemplateCatalog : ITemplateCatalog
    {
        private readonly Dictionary<string, MessageTemplate> _store = new(StringComparer.OrdinalIgnoreCase)
        {
            ["gift.received.email"] = new()
            {
                Id = "gift.received.email",
                Subject = "Hi {Name}, you received a {Amount} {Currency} gift from {Company}!",
                Body = "<p>Hi {Name},</p><p>{Company} just sent you a <strong>{Amount} {Currency}</strong> FlyGift card. " +
                       "Use code <strong>{Code}</strong> to redeem at <a href=\"{ClaimUrl}\">flygift.app</a>.</p>" +
                       "<p>Bon voyage ✈︎</p>",
            },
            ["gift.received.sms"] = new()
            {
                Id = "gift.received.sms",
                Body = "Hi {Name}, you got a {Amount} {Currency} FlyGift from {Company}! Code: {Code} — {ClaimUrl}",
            },
            ["otp.sms"] = new()
            {
                Id = "otp.sms",
                Body = "Your FlyGift verification code is {Code}. Expires in {Minutes} min.",
            },
            ["invoice.ready.email"] = new()
            {
                Id = "invoice.ready.email",
                Subject = "FlyGift Invoice {InvoiceNumber} — {Amount} {Currency}",
                Body = "<p>Your invoice is ready: <a href=\"{InvoiceUrl}\">{InvoiceNumber}</a></p>",
            },
            ["booking.confirmed.email"] = new()
            {
                Id = "booking.confirmed.email",
                Subject = "Booking confirmed — {FlightNumber} ({Origin}→{Destination})",
                Body = "<p>Hi {Name}, your seat {Seat} is reserved on {FlightNumber} ({Origin}→{Destination}) departing {Departure}.</p>",
            },
        };

        public bool TryGet(string templateId, out MessageTemplate? template)
            => _store.TryGetValue(templateId, out template);
    }
}
