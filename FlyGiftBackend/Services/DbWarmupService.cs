using FlyGiftBackend.Data;
using Microsoft.EntityFrameworkCore;

namespace FlyGiftBackend.Services
{
    /// <summary>
    /// Opens one DB connection at startup so the first real user request
    /// (login) doesn't pay Neon cold-connect + EF retry latency.
    /// </summary>
    public sealed class DbWarmupService : IHostedService
    {
        private readonly IServiceProvider _services;
        private readonly ILogger<DbWarmupService> _log;

        public DbWarmupService(IServiceProvider services, ILogger<DbWarmupService> log)
        {
            _services = services;
            _log = log;
        }

        public async Task StartAsync(CancellationToken cancellationToken)
        {
            try
            {
                using var scope = _services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                await db.Database.ExecuteSqlRawAsync("SELECT 1", cancellationToken);
                _log.LogInformation("Database warmup complete.");
            }
            catch (Exception ex)
            {
                _log.LogWarning(ex, "Database warmup failed — first request may be slow.");
            }
        }

        public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
    }
}
