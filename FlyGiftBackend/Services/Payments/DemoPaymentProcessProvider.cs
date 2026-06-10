namespace FlyGiftBackend.Services.Payments
{
    /// <summary>
    /// Marker provider registered when <c>Payments:Mode=Demo</c>. Wallet
    /// top-ups are credited instantly inside
    /// <see cref="Controllers.WalletController"/> — no hosted-page redirect.
    /// </summary>
    public sealed class DemoPaymentProcessProvider : IPaymentProcessProvider
    {
        public string ProviderName => "Demo";
        public bool IsConfigured => true;

        public Task<PaymentProcessResult> CreatePaymentProcessAsync(
            PaymentProcessRequest request, CancellationToken ct) =>
            Task.FromResult(new PaymentProcessResult
            {
                Success = false,
                FailureReason = "Demo mode credits wallets directly — use Wallet/Topup with paymentMethodToken.",
            });
    }
}
