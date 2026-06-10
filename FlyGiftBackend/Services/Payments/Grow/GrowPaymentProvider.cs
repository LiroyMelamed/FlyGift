using Microsoft.Extensions.Options;

namespace FlyGiftBackend.Services.Payments.Grow
{
    /// <summary>
    /// Real Grow implementation of <see cref="IPaymentProcessProvider"/>.
    /// Maps the provider-neutral <see cref="PaymentProcessRequest"/> onto
    /// Grow's createPaymentProcess body and unwraps the URL+processId from
    /// the response. The provider is registered in DI only when
    /// <see cref="GrowOptions.IsConfigured"/> is true; otherwise the
    /// container falls back to <see cref="DisabledPaymentProcessProvider"/>.
    /// </summary>
    public sealed class GrowPaymentProvider : IPaymentProcessProvider
    {
        private readonly GrowApiClient _api;
        private readonly GrowOptions _opts;
        private readonly ILogger<GrowPaymentProvider> _log;

        public GrowPaymentProvider(
            GrowApiClient api,
            IOptions<GrowOptions> opts,
            ILogger<GrowPaymentProvider> log)
        {
            _api = api;
            _opts = opts.Value;
            _log = log;
        }

        public string ProviderName => $"Grow ({_opts.Mode})";

        public bool IsConfigured => _opts.IsConfigured;

        public async Task<PaymentProcessResult> CreatePaymentProcessAsync(
            PaymentProcessRequest request, CancellationToken ct)
        {
            if (!IsConfigured)
            {
                return new PaymentProcessResult
                {
                    Success = false,
                    FailureReason = "Grow credentials are not configured.",
                };
            }

            // successUrl/cancelUrl: per Grow docs, these MUST be public
            // URLs (no localhost) and contain only valid ASCII. We default
            // to the values from configuration when the caller didn't set
            // them — that's the common case for wallet top-ups.
            var successUrl = !string.IsNullOrWhiteSpace(request.SuccessUrl)
                ? request.SuccessUrl
                : _opts.SuccessUrl;
            var cancelUrl = !string.IsNullOrWhiteSpace(request.CancelUrl)
                ? request.CancelUrl
                : _opts.CancelUrl;

            var payload = new GrowCreateProcessRequest
            {
                UserId = _opts.UserId,
                PageCode = _opts.PageCode,
                ApiKey = _opts.ApiKey,
                Sum = request.Sum,
                PaymentNum = request.PaymentNum,
                Description = request.Description,
                CustomerName = request.CustomerName,
                CustomerEmail = request.CustomerEmail,
                CustomerPhone = request.CustomerPhone,
                SuccessUrl = string.IsNullOrWhiteSpace(successUrl) ? null : successUrl,
                CancelUrl = string.IsNullOrWhiteSpace(cancelUrl) ? null : cancelUrl,
                NotifyUrl = string.IsNullOrWhiteSpace(_opts.WebhookUrl) ? null : _opts.WebhookUrl,
                InvoiceNotifyUrl = string.IsNullOrWhiteSpace(_opts.WebhookUrl) ? null : _opts.WebhookUrl,
                ExternalReference = request.ExternalReference,
            };

            try
            {
                var resp = await _api.CreatePaymentProcessAsync(payload, ct);
                if (resp.Status != 1 || resp.Data is null || string.IsNullOrWhiteSpace(resp.Data.Url))
                {
                    _log.LogWarning(
                        "Grow rejected createPaymentProcess: status={Status} err={Err}",
                        resp.Status, resp.Err);
                    return new PaymentProcessResult
                    {
                        Success = false,
                        FailureReason = resp.Err ?? "יצירת עמוד התשלום נכשלה.",
                    };
                }

                // Per docs the URL is valid for 10 minutes — surface that
                // to the controller so the frontend can show a countdown.
                return new PaymentProcessResult
                {
                    Success = true,
                    Url = resp.Data.Url,
                    ProcessId = resp.Data.ProcessId ?? resp.Data.ProcessToken,
                    ExpiresAt = DateTime.UtcNow.AddMinutes(10),
                };
            }
            catch (GrowApiException ex)
            {
                _log.LogWarning(ex, "Grow createPaymentProcess threw");
                return new PaymentProcessResult
                {
                    Success = false,
                    FailureReason = "שירות התשלומים אינו זמין כעת. נסו שוב מאוחר יותר.",
                };
            }
        }
    }
}
