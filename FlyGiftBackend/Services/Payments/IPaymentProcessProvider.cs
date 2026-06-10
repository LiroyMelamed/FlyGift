namespace FlyGiftBackend.Services.Payments
{
    /// <summary>
    /// Hosted-page payment contract — the provider returns a secure URL the
    /// user is redirected to, then notifies us via webhook when the
    /// transaction settles. Replaces the old synchronous "charge a saved
    /// card token" model (Stripe PaymentIntents) with the redirect flow
    /// that Grow / Meshulam / similar Israeli gateways use.
    ///
    /// Implementations:
    ///   • <see cref="Grow.GrowPaymentProvider"/> — production / sandbox.
    ///   • <see cref="DisabledPaymentProcessProvider"/> — fallback when no
    ///     credentials are configured; surfaces a 503 to the controller.
    /// </summary>
    public interface IPaymentProcessProvider
    {
        string ProviderName { get; }

        /// <summary>True when the provider has all the credentials it needs to call the gateway.</summary>
        bool IsConfigured { get; }

        /// <summary>
        /// Asks the gateway to create a hosted payment session for the
        /// given amount and returns the redirect URL plus an opaque
        /// process id we'll match against the eventual webhook callback.
        /// </summary>
        Task<PaymentProcessResult> CreatePaymentProcessAsync(
            PaymentProcessRequest request, CancellationToken ct);
    }

    public sealed class PaymentProcessRequest
    {
        public int UserId { get; set; }
        public decimal Sum { get; set; }
        public string Currency { get; set; } = "ILS";
        /// <summary>Number of installments (Grow's <c>paymentNum</c>). Default 1 = full amount up front.</summary>
        public int PaymentNum { get; set; } = 1;
        /// <summary>Where the gateway redirects the browser after a successful payment.</summary>
        public string SuccessUrl { get; set; } = "";
        /// <summary>Where the gateway redirects on cancel / failure.</summary>
        public string CancelUrl { get; set; } = "";
        public string? Description { get; set; }
        public string? CustomerName { get; set; }
        public string? CustomerEmail { get; set; }
        public string? CustomerPhone { get; set; }
        /// <summary>
        /// Stable correlation id we hand to Grow as <c>cField1</c>. The
        /// webhook echoes it back so we can credit the right wallet
        /// without trusting query-string params.
        /// </summary>
        public string ExternalReference { get; set; } = "";
    }

    public sealed class PaymentProcessResult
    {
        public bool Success { get; set; }
        public string? Url { get; set; }
        /// <summary>Provider-side transaction/process id (Grow <c>processId</c>) — surfaced for support tickets.</summary>
        public string? ProcessId { get; set; }
        public DateTime ExpiresAt { get; set; }
        public string? FailureReason { get; set; }
    }

    /// <summary>
    /// Inert provider registered when no real gateway has credentials.
    /// Always returns <c>Success=false</c> so <see cref="Controllers.WalletController"/>
    /// can surface a 503 envelope instead of silently failing.
    /// </summary>
    public sealed class DisabledPaymentProcessProvider : IPaymentProcessProvider
    {
        public string ProviderName => "Disabled";
        public bool IsConfigured => false;
        public Task<PaymentProcessResult> CreatePaymentProcessAsync(
            PaymentProcessRequest request, CancellationToken ct) =>
            Task.FromResult(new PaymentProcessResult
            {
                Success = false,
                FailureReason = "Payment provider is not configured.",
            });
    }
}
