using FlyGiftBackend.Data;
using FlyGiftBackend.Models;
using Microsoft.EntityFrameworkCore;

namespace FlyGiftBackend.Services
{
    /// <summary>
    /// Nightly background worker that flips Active gift cards whose
    /// ExpirationDate has passed to Expired.
    ///
    /// For multi-instance prod, replace with Hangfire / Quartz with a
    /// distributed lock so only one node runs the sweep.
    /// </summary>
    public class GiftCardExpirationWorker : BackgroundService
    {
        private readonly IServiceProvider _services;
        private readonly ILogger<GiftCardExpirationWorker> _log;
        private static readonly TimeSpan RunEvery = TimeSpan.FromHours(24);
        private const int BatchSize = 500;

        public GiftCardExpirationWorker(
            IServiceProvider services,
            ILogger<GiftCardExpirationWorker> log)
        {
            _services = services;
            _log = log;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            // Wait until ~02:00 server time on first launch, then run every 24h.
            var firstDelay = ComputeInitialDelay(TimeSpan.FromHours(2));
            _log.LogInformation("ExpirationWorker scheduled in {Delay}", firstDelay);

            try { await Task.Delay(firstDelay, stoppingToken); }
            catch (TaskCanceledException) { return; }

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var swept = await SweepExpiredAsync(stoppingToken);
                    _log.LogInformation("ExpirationWorker swept {Count} cards", swept);
                }
                catch (Exception ex)
                {
                    _log.LogError(ex, "ExpirationWorker run failed");
                }

                try { await Task.Delay(RunEvery, stoppingToken); }
                catch (TaskCanceledException) { return; }
            }
        }

        private async Task<int> SweepExpiredAsync(CancellationToken ct)
        {
            using var scope = _services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var now = DateTime.UtcNow;
            var total = 0;

            while (!ct.IsCancellationRequested)
            {
                var batch = await db.GiftCards
                    .Where(g => g.Status == GiftCardStatus.Active && g.ExpirationDate <= now)
                    .OrderBy(g => g.Id)
                    .Take(BatchSize)
                    .ToListAsync(ct);

                if (batch.Count == 0) break;

                foreach (var card in batch)
                {
                    card.Status = GiftCardStatus.Expired;
                }
                await db.SaveChangesAsync(ct);
                total += batch.Count;

                if (batch.Count < BatchSize) break;
            }

            return total;
        }

        private static TimeSpan ComputeInitialDelay(TimeSpan timeOfDay)
        {
            var now = DateTime.Now;
            var next = now.Date.Add(timeOfDay);
            if (next <= now) next = next.AddDays(1);
            return next - now;
        }
    }
}
