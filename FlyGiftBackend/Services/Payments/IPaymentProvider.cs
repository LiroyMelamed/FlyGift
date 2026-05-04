namespace FlyGiftBackend.Services.Payments
{
    /// <summary>
    /// Stripe placeholder. Swap with the real Stripe SDK by implementing
    /// this interface against PaymentIntents.
    /// </summary>
    public interface IPaymentProvider
    {
        string ProviderName { get; }
        Task<PaymentResult> ChargeAsync(PaymentChargeRequest request, CancellationToken ct);
    }

    public class PaymentChargeRequest
    {
        public int UserId { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "USD";
        /// <summary>Tokenized card / payment method id (Stripe pm_xxx).</summary>
        public string PaymentMethodToken { get; set; } = "";
        public string Description { get; set; } = "";
    }

    public class PaymentResult
    {
        public bool Success { get; set; }
        public string? ChargeId { get; set; }
        public string? Brand { get; set; }       // visa, mastercard, ...
        public string? Last4 { get; set; }
        public string? FailureReason { get; set; }
    }

    /// <summary>
    /// Mock that always succeeds for tokens starting with "pm_test_" and
    /// fails for "pm_test_decline_". Mirrors Stripe's test-card behavior so
    /// the frontend flows can be exercised end-to-end without a key.
    /// </summary>
    public class MockStripePaymentProvider : IPaymentProvider
    {
        public string ProviderName => "stripe-mock";

        public Task<PaymentResult> ChargeAsync(PaymentChargeRequest request, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(request.PaymentMethodToken))
                return Task.FromResult(new PaymentResult { Success = false, FailureReason = "Missing payment method." });

            if (request.PaymentMethodToken.StartsWith("pm_test_decline", StringComparison.OrdinalIgnoreCase))
                return Task.FromResult(new PaymentResult { Success = false, FailureReason = "Card declined." });

            return Task.FromResult(new PaymentResult
            {
                Success = true,
                ChargeId = "ch_mock_" + Guid.NewGuid().ToString("N")[..16],
                Brand = "visa",
                Last4 = "4242",
            });
        }
    }
}
