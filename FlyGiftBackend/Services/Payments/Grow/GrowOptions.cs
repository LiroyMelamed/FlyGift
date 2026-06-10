namespace FlyGiftBackend.Services.Payments.Grow
{
    /// <summary>
    /// Strict two-state toggle. Flips Grow base URL between sandbox and
    /// production via a single config line.
    /// </summary>
    public enum GrowEnvironment
    {
        Test,
        Production,
    }

    /// <summary>
    /// Bound from configuration section <c>Grow</c> (or env vars
    /// <c>GROW__APIKEY</c>, <c>GROW__USERID</c>, <c>GROW__PAGECODE</c>,
    /// <c>GROW__MODE</c>). When credentials are missing the provider
    /// reports <c>IsConfigured=false</c> and the DI container registers
    /// <see cref="DisabledPaymentProcessProvider"/> as the fallback so the
    /// rest of the app keeps starting.
    ///
    /// Switching environments is a single line change:
    /// <c>Grow:Mode</c> = <c>Test</c> | <c>Production</c>. The base URL
    /// flips automatically; <see cref="BaseUrl"/> only needs to be set
    /// when overriding (proxy / staging mirror).
    /// </summary>
    public sealed class GrowOptions
    {
        public GrowEnvironment Mode { get; set; } = GrowEnvironment.Test;

        /// <summary>API key issued by Grow during onboarding. Sent in the JSON body.</summary>
        public string ApiKey { get; set; } = "";

        /// <summary>Account user id from the Grow dashboard (<c>userId</c> field).</summary>
        public string UserId { get; set; } = "";

        /// <summary>Page code from the Grow dashboard (<c>pageCode</c> field).</summary>
        public string PageCode { get; set; } = "";

        /// <summary>Optional override. Empty → derived from <see cref="Mode"/>.</summary>
        public string BaseUrl { get; set; } = "";

        /// <summary>Where Grow redirects on a successful payment. Must not be localhost in production.</summary>
        public string SuccessUrl { get; set; } = "";

        /// <summary>Where Grow redirects on cancel / failure.</summary>
        public string CancelUrl { get; set; } = "";

        /// <summary>
        /// Public webhook URL Grow will POST settlement notifications to
        /// (sent as <c>notifyUrl</c> in the create-process payload). Must be
        /// an HTTPS, externally-reachable URL in production.
        /// </summary>
        public string WebhookUrl { get; set; } = "";

        public bool IsConfigured =>
            !string.IsNullOrWhiteSpace(ApiKey) &&
            !string.IsNullOrWhiteSpace(UserId) &&
            !string.IsNullOrWhiteSpace(PageCode);

        /// <summary>Resolved Grow base URL — explicit override wins, otherwise derived from <see cref="Mode"/>.</summary>
        public string ResolveBaseUrl() =>
            !string.IsNullOrWhiteSpace(BaseUrl)
                ? BaseUrl
                : Mode switch
                {
                    GrowEnvironment.Production => "https://meshulam.co.il",
                    _ => "https://sandbox.meshulam.co.il",
                };
    }
}
