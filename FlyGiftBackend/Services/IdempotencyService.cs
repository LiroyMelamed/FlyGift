using Microsoft.Extensions.Caching.Memory;

namespace FlyGiftBackend.Services
{
    /// <summary>
    /// In-memory idempotency cache. For multi-instance deployments,
    /// swap the underlying store for Redis or a DB table
    /// (PK = (UserId, IdempotencyKey)) without changing this contract.
    /// </summary>
    public interface IIdempotencyService
    {
        bool TryGet<T>(string scope, int userId, string key, out T? value) where T : class;
        void Save<T>(string scope, int userId, string key, T value) where T : class;
    }

    public class IdempotencyService : IIdempotencyService
    {
        private readonly IMemoryCache _cache;
        private static readonly TimeSpan Ttl = TimeSpan.FromHours(24);

        public IdempotencyService(IMemoryCache cache) => _cache = cache;

        private static string BuildKey(string scope, int userId, string key)
            => $"idem:{scope}:{userId}:{key}";

        public bool TryGet<T>(string scope, int userId, string key, out T? value) where T : class
        {
            if (_cache.TryGetValue(BuildKey(scope, userId, key), out var cached) && cached is T typed)
            {
                value = typed;
                return true;
            }
            value = null;
            return false;
        }

        public void Save<T>(string scope, int userId, string key, T value) where T : class
        {
            _cache.Set(BuildKey(scope, userId, key), value, Ttl);
        }
    }
}
