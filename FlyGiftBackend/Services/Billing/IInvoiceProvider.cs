using FlyGiftBackend.Services.Messaging;

namespace FlyGiftBackend.Services.Billing
{
    public class InvoiceLine
    {
        public string Description { get; set; } = "";
        public int Quantity { get; set; } = 1;
        public decimal UnitAmount { get; set; }
        public decimal Total => Quantity * UnitAmount;
    }

    public class InvoiceRequest
    {
        public int CompanyUserId { get; set; }
        public string CompanyName { get; set; } = "";
        public string? CompanyEmail { get; set; }
        public string Currency { get; set; } = "USD";
        public List<InvoiceLine> Lines { get; set; } = new();
        /// <summary>Stable correlation id, e.g. "bulk:&lt;guid&gt;".</summary>
        public string ExternalReference { get; set; } = "";
    }

    public class InvoiceResult
    {
        public bool Success { get; set; }
        public string InvoiceNumber { get; set; } = "";
        public string Url { get; set; } = "";
        public DateTime IssuedAt { get; set; }
        public decimal Total { get; set; }
        public string? FailureReason { get; set; }
    }

    /// <summary>
    /// Hexagonal port for invoice generation. Default implementation is a
    /// mock that fabricates a PDF URL; swap for Stripe Invoicing / Chargebee
    /// / QuickBooks when a real billing account is provisioned.
    /// </summary>
    public interface IInvoiceProvider
    {
        Task<InvoiceResult> GenerateAsync(InvoiceRequest request, CancellationToken ct = default);
    }

    public class MockInvoiceProvider : IInvoiceProvider
    {
        private static int _seq;
        private readonly ILogger<MockInvoiceProvider> _log;
        private readonly IMessagingProvider _msg;

        public MockInvoiceProvider(ILogger<MockInvoiceProvider> log, IMessagingProvider msg)
        {
            _log = log;
            _msg = msg;
        }

        public async Task<InvoiceResult> GenerateAsync(InvoiceRequest request, CancellationToken ct = default)
        {
            // Simulate a 100ms external call so client UX accounts for latency.
            await Task.Delay(100, ct);

            var seq = Interlocked.Increment(ref _seq);
            var year = DateTime.UtcNow.Year;
            var number = $"INV-{year}-{seq:D5}";
            var url = $"https://invoices.flygift.app/{year}/{number}.pdf";
            var total = request.Lines.Sum(l => l.Total);

            _log.LogInformation(
                "[MOCK INVOICE] {Number} for company {CompanyId} ({Lines} lines, {Total} {Currency}) -> {Url}",
                number, request.CompanyUserId, request.Lines.Count, total, request.Currency, url);

            if (!string.IsNullOrWhiteSpace(request.CompanyEmail))
            {
                await _msg.SendEmailAsync("invoice.ready.email", request.CompanyEmail, new Dictionary<string, string?>
                {
                    ["Name"] = request.CompanyName,
                    ["InvoiceNumber"] = number,
                    ["InvoiceUrl"] = url,
                    ["Amount"] = total.ToString("0.00"),
                    ["Currency"] = request.Currency,
                }, ct);
            }

            return new InvoiceResult
            {
                Success = true,
                InvoiceNumber = number,
                Url = url,
                IssuedAt = DateTime.UtcNow,
                Total = total,
            };
        }
    }
}
