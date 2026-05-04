using Microsoft.Extensions.Options;

namespace FlyGiftBackend.Services.Messaging
{
    public class SendGridOptions
    {
        public string? ApiKey { get; set; }
        public string FromEmail { get; set; } = "no-reply@flygift.app";
        public string FromName { get; set; } = "FlyGift";
    }

    /// <summary>
    /// SendGrid email transport. When <see cref="SendGridOptions.ApiKey"/>
    /// is missing the provider degrades to log-only mode so dev/test
    /// environments work without external accounts.
    /// </summary>
    public class SendGridEmailProvider : IEmailProvider
    {
        private readonly SendGridOptions _opts;
        private readonly ILogger<SendGridEmailProvider> _log;
        private readonly IHttpClientFactory _http;

        public SendGridEmailProvider(
            IOptions<SendGridOptions> opts,
            IHttpClientFactory http,
            ILogger<SendGridEmailProvider> log)
        {
            _opts = opts.Value;
            _http = http;
            _log = log;
        }

        public async Task<MessageDeliveryResult> SendAsync(EmailMessage msg, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(_opts.ApiKey))
            {
                _log.LogInformation(
                    "[SENDGRID-MOCK] -> {To} | {Subject} | (no API key configured; would send body of {Len} chars)",
                    msg.To, msg.Subject, msg.Body?.Length ?? 0);
                return new MessageDeliveryResult { Success = true, ProviderMessageId = $"mock-{Guid.NewGuid():N}" };
            }

            try
            {
                using var client = _http.CreateClient(nameof(SendGridEmailProvider));
                client.BaseAddress = new Uri("https://api.sendgrid.com/v3/");
                client.DefaultRequestHeaders.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _opts.ApiKey);

                var payload = new
                {
                    personalizations = new[]
                    {
                        new { to = new[] { new { email = msg.To, name = msg.ToName } } }
                    },
                    from = new { email = _opts.FromEmail, name = _opts.FromName },
                    subject = msg.Subject,
                    content = new[]
                    {
                        new { type = msg.IsHtml ? "text/html" : "text/plain", value = msg.Body }
                    }
                };

                var resp = await client.PostAsJsonAsync("mail/send", payload, ct);
                if (!resp.IsSuccessStatusCode)
                {
                    var err = await resp.Content.ReadAsStringAsync(ct);
                    _log.LogWarning("SendGrid send failed: {Status} {Body}", resp.StatusCode, err);
                    return new MessageDeliveryResult { Success = false, FailureReason = err };
                }

                return new MessageDeliveryResult
                {
                    Success = true,
                    ProviderMessageId = resp.Headers.TryGetValues("X-Message-Id", out var v) ? string.Join(',', v) : null,
                };
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "SendGrid send threw");
                return new MessageDeliveryResult { Success = false, FailureReason = ex.Message };
            }
        }
    }
}
