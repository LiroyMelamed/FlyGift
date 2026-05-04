using System.Threading.Channels;

namespace FlyGiftBackend.Services.Bulk
{
    /// <summary>
    /// Background dispatch queue + hosted worker. Push a job from the
    /// controller, return immediately, let the worker fan out emails/SMS.
    /// </summary>
    public interface IBulkDispatchQueue
    {
        ValueTask EnqueueAsync(BulkDispatchJob job, CancellationToken ct = default);
        IAsyncEnumerable<BulkDispatchJob> ReadAllAsync(CancellationToken ct);
    }

    public class BulkDispatchJob
    {
        public Guid BatchId { get; set; }
        public int CompanyUserId { get; set; }
        public List<BulkDispatchJobItem> Items { get; set; } = new();
    }

    public class BulkDispatchJobItem
    {
        public int GiftCardId { get; set; }
        public string RecipientName { get; set; } = "";
        public string Email { get; set; } = "";
        public string? Phone { get; set; }
        public string Code { get; set; } = "";
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "USD";
    }

    public class BulkDispatchQueue : IBulkDispatchQueue
    {
        private readonly Channel<BulkDispatchJob> _channel =
            Channel.CreateUnbounded<BulkDispatchJob>(new UnboundedChannelOptions
            {
                SingleReader = true,
                SingleWriter = false,
            });

        public ValueTask EnqueueAsync(BulkDispatchJob job, CancellationToken ct = default)
            => _channel.Writer.WriteAsync(job, ct);

        public IAsyncEnumerable<BulkDispatchJob> ReadAllAsync(CancellationToken ct)
            => _channel.Reader.ReadAllAsync(ct);
    }

    public class BulkDispatchWorker : BackgroundService
    {
        private readonly IBulkDispatchQueue _queue;
        private readonly IServiceScopeFactory _scopes;
        private readonly ILogger<BulkDispatchWorker> _log;

        public BulkDispatchWorker(
            IBulkDispatchQueue queue,
            IServiceScopeFactory scopes,
            ILogger<BulkDispatchWorker> log)
        {
            _queue = queue;
            _scopes = scopes;
            _log = log;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            await foreach (var job in _queue.ReadAllAsync(stoppingToken))
            {
                using var scope = _scopes.CreateScope();
                var notifier = scope.ServiceProvider.GetRequiredService<INotificationService>();

                _log.LogInformation("Dispatching batch {BatchId} ({Count} items)",
                    job.BatchId, job.Items.Count);

                foreach (var item in job.Items)
                {
                    if (stoppingToken.IsCancellationRequested) return;
                    try
                    {
                        await notifier.SendGiftEmailAsync(
                            item.Email, item.RecipientName, item.Code,
                            item.Amount, item.Currency, companyName: null, stoppingToken);

                        if (!string.IsNullOrWhiteSpace(item.Phone))
                        {
                            await notifier.SendGiftSmsAsync(
                                item.Phone!, item.RecipientName, item.Code,
                                item.Amount, item.Currency, companyName: null, stoppingToken);
                        }
                    }
                    catch (Exception ex)
                    {
                        _log.LogWarning(ex,
                            "Notification failed for card {Card} in batch {Batch}",
                            item.GiftCardId, job.BatchId);
                    }
                }
            }
        }
    }
}
