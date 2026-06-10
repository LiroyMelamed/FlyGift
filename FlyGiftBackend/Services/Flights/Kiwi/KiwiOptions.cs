namespace FlyGiftBackend.Services.Flights.Kiwi
{
    /// <summary>
    /// Strict two-state toggle. Drives the Tequila base URL and, in
    /// <see cref="Test"/>, forces <c>test_payments=1</c> on Booking API
    /// calls so no real money is moved.
    /// </summary>
    public enum KiwiEnvironment
    {
        Test,
        Production,
    }

    /// <summary>
    /// Bound from configuration section <c>Travel:Kiwi</c> (or env vars
    /// <c>TRAVEL__KIWI__APIKEY</c>, <c>TRAVEL__KIWI__MODE</c>). When
    /// <see cref="ApiKey"/> is empty the Kiwi provider is NOT registered
    /// and the system falls back to the local mock provider — keeps
    /// dev/CI unbroken without an upstream.
    ///
    /// Switching the entire system between sandbox and live is a single
    /// line change: <c>Travel:Kiwi:Mode</c> = <c>Test</c> | <c>Production</c>
    /// (or env <c>TRAVEL__KIWI__MODE</c>). The base URL flips automatically;
    /// <see cref="BaseUrl"/> only needs to be set when overriding (proxy /
    /// staging mirror).
    /// </summary>
    public sealed class KiwiOptions
    {
        /// <summary>Tequila API key. Sent as the <c>apikey</c> request header.</summary>
        public string ApiKey { get; set; } = "";

        /// <summary>
        /// Optional override. When empty, the URL is derived from <see cref="Mode"/>
        /// — which is the supported way to switch environments. Set this only
        /// when pointing at a proxy / on-prem mirror.
        /// </summary>
        public string BaseUrl { get; set; } = "";

        /// <summary>ISO-4217 currency code Tequila will price offers in.</summary>
        public string Currency { get; set; } = "ILS";

        /// <summary>
        /// Environment toggle — <c>Test</c> (default, safe) or <c>Production</c>.
        /// Bound from configuration as a string so existing values like
        /// "Sandbox" / "Live" still parse with sensible aliases.
        /// </summary>
        public KiwiEnvironment Mode { get; set; } = KiwiEnvironment.Test;

        /// <summary>Hard cap on offers returned from a single search.</summary>
        public int MaxOffers { get; set; } = 30;

        /// <summary>UI locale for amenity text. Tequila supports a small set incl. <c>he</c>.</summary>
        public string Locale { get; set; } = "he";

        /// <summary>Affiliate id (Tequila dashboard → Account). Echoed back on bookings for revenue attribution.</summary>
        public string AffiliateId { get; set; } = "";

        public bool IsConfigured => !string.IsNullOrWhiteSpace(ApiKey);

        /// <summary>True when running against the Test endpoints — booking calls must include <c>test_payments=1</c>.</summary>
        public bool UseTestPayments => Mode == KiwiEnvironment.Test;

        /// <summary>
        /// Resolves the active Tequila base URL: explicit <see cref="BaseUrl"/>
        /// override wins; otherwise the URL is derived from <see cref="Mode"/>.
        /// </summary>
        public string ResolveBaseUrl() =>
            !string.IsNullOrWhiteSpace(BaseUrl)
                ? BaseUrl
                // Tequila's public host is tequila-api.kiwi.com for both
                // sandbox (test_payments=1 on booking) and live traffic.
                // The old staging./api. subdomains do not resolve.
                : "https://tequila-api.kiwi.com";
    }
}
