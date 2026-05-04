using System.Text;
using Microsoft.Extensions.Options;

namespace FlyGiftBackend.Services.Messaging
{
    public class TwilioOptions
    {
        public string? AccountSid { get; set; }
        public string? AuthToken { get; set; }
        public string FromNumber { get; set; } = "+10000000000";
    }

    /// <summary>
    /// Twilio SMS transport. Falls back to log-only mode when credentials
    /// are absent so the entire stack runs offline in dev.
    /// </summary>
    public class TwilioSmsProvider : ISmsProvider
    {
        private readonly TwilioOptions _opts;
        private readonly ILogger<TwilioSmsProvider> _log;
        private readonly IHttpClientFactory _http;

        public TwilioSmsProvider(
            IOptions<TwilioOptions> opts,
            IHttpClientFactory http,
            ILogger<TwilioSmsProvider> log)
        {
            _opts = opts.Value;
            _http = http;
            _log = log;
        }

        public async Task<MessageDeliveryResult> SendAsync(SmsMessage msg, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(msg.ToPhone))
                return new MessageDeliveryResult { Success = false, FailureReason = "ToPhone is empty." };

            if (string.IsNullOrWhiteSpace(_opts.AccountSid) || string.IsNullOrWhiteSpace(_opts.AuthToken))
            {
                _log.LogInformation("[TWILIO-MOCK] -> {Phone} | {Body}", msg.ToPhone, msg.Body);
                return new MessageDeliveryResult { Success = true, ProviderMessageId = $"mock-{Guid.NewGuid():N}" };
            }

            try
            {
                using var client = _http.CreateClient(nameof(TwilioSmsProvider));
                var basic = Convert.ToBase64String(
                    Encoding.UTF8.GetBytes($"{_opts.AccountSid}:{_opts.AuthToken}"));
                client.DefaultRequestHeaders.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", basic);

                var form = new FormUrlEncodedContent(new[]
                {
                    new KeyValuePair<string, string>("From", _opts.FromNumber),
                    new KeyValuePair<string, string>("To", msg.ToPhone),
                    new KeyValuePair<string, string>("Body", msg.Body),
                });

                var url = $"https://api.twilio.com/2010-04-01/Accounts/{_opts.AccountSid}/Messages.json";
                var resp = await client.PostAsync(url, form, ct);
                if (!resp.IsSuccessStatusCode)
                {
                    var err = await resp.Content.ReadAsStringAsync(ct);
                    _log.LogWarning("Twilio send failed: {Status} {Body}", resp.StatusCode, err);
                    return new MessageDeliveryResult { Success = false, FailureReason = err };
                }
                return new MessageDeliveryResult { Success = true };
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "Twilio send threw");
                return new MessageDeliveryResult { Success = false, FailureReason = ex.Message };
            }
        }
    }
}
