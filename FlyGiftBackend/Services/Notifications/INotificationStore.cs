using FlyGiftBackend.Data;
using FlyGiftBackend.Models;

namespace FlyGiftBackend.Services.Notifications
{
    /// <summary>
    /// Internal contract used by other services (booking, gift, bulk) to
    /// publish activity-feed entries. Best-effort: failures are logged and
    /// swallowed so a notification glitch never rolls back a user's real
    /// transaction.
    /// </summary>
    public interface INotificationStore
    {
        Task CreateAsync(
            int userId,
            string type,
            string title,
            string? body = null,
            string? href = null,
            CancellationToken ct = default);
    }

    public class NotificationStore : INotificationStore
    {
        private readonly AppDbContext _db;
        private readonly ILogger<NotificationStore> _log;

        public NotificationStore(AppDbContext db, ILogger<NotificationStore> log)
        {
            _db = db;
            _log = log;
        }

        public async Task CreateAsync(
            int userId,
            string type,
            string title,
            string? body = null,
            string? href = null,
            CancellationToken ct = default)
        {
            try
            {
                var n = new Notification
                {
                    UserId = userId,
                    Type = type,
                    Title = title,
                    Body = body,
                    Href = href,
                    CreatedAt = DateTime.UtcNow,
                };
                _db.Notifications.Add(n);
                await _db.SaveChangesAsync(ct);
            }
            catch (Exception ex)
            {
                // Notifications are a side channel — never propagate a
                // failure here to the caller. Log and move on.
                _log.LogWarning(
                    ex,
                    "Failed to write notification {Type} for user {UserId}",
                    type, userId);
            }
        }
    }
}
