namespace FlyGiftBackend.Services.Flights
{
    /// <summary>
    /// Deterministic local "booking" for dev / CI when no Kiwi API key is
    /// configured. Mirrors the contract of <see cref="IFlightBookingProvider"/>
    /// so the rest of the booking pipeline runs unchanged. Always tagged
    /// IsTest=true; the booking row lands in Neon with status TestConfirmed.
    /// </summary>
    public sealed class MockFlightBookingProvider : IFlightBookingProvider
    {
        public string ProviderName => "Mock Booking";

        public Task<BookOrderResult> BookAsync(BookOrderRequest request, CancellationToken ct)
        {
            // Stable provider-booking-id derived from offer id so re-runs
            // with the same idempotency key resolve to the same value.
            var hash = Math.Abs(request.Offer.Id.GetHashCode());
            return Task.FromResult(new BookOrderResult
            {
                ProviderBookingId = $"mock-{hash:x8}",
                Pnr = $"FG{hash % 1_000_000:D6}",
                FinalPrice = request.Offer.Price.Total,
                Currency = request.Offer.Price.Currency,
                IsTest = true,
            });
        }
    }
}
