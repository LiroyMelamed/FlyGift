using Microsoft.Extensions.Hosting;

namespace FlyGiftBackend.Auth
{
    /// <summary>
    /// Fail-fast guard for required secrets. Runs once at boot. In
    /// Development we warn so local runs stay friendly; in any other
    /// environment we throw, blocking the process from binding the
    /// port. The intent is that no production instance can ever serve
    /// traffic with placeholder credentials.
    /// </summary>
    public static class StartupValidator
    {
        public static void EnsureProductionSecrets(IConfiguration cfg, IHostEnvironment env, ILogger log)
        {
            // Each entry: (config key, env-var equivalent, label).
            var required = new (string Key, string EnvName, string Label)[]
            {
                ("ConnectionStrings:FlyGiftDatabase", "ConnectionStrings__FlyGiftDatabase", "Database connection string"),
                ("JwtSettings:Secret",                "JwtSettings__Secret",                "JWT signing secret"),
                ("Travel:Kiwi:ApiKey",                "Travel__Kiwi__ApiKey",               "Kiwi.com Tequila API key"),
            };

            var missing = new List<string>();
            foreach (var (key, envName, label) in required)
            {
                if (string.IsNullOrWhiteSpace(cfg[key]))
                    missing.Add($"  • {label} (set env: {envName})");
            }

            if (missing.Count == 0) return;

            var message =
                "Startup blocked — required secrets are missing:\n" +
                string.Join("\n", missing) +
                "\nSee FlyGiftBackend/.env.production.example for the full list.";

            if (env.IsDevelopment())
            {
                // Don't block local dev (the user-secrets store already
                // has DB + JWT; Kiwi is optional in dev — the mock
                // providers fill in).
                log.LogWarning(message);
            }
            else
            {
                throw new InvalidOperationException(message);
            }
        }
    }
}
