using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace FlyGiftBackend.Services.Payments.Grow
{
    /// <summary>
    /// Translated Grow API failure carrying upstream context so the
    /// provider can map to a Hebrew message without leaking raw English.
    /// </summary>
    public sealed class GrowApiException : Exception
    {
        public int? Status { get; }
        public int? HttpStatusCode { get; }
        public GrowApiException(string message, int? status = null, int? httpStatusCode = null, Exception? inner = null)
            : base(message, inner)
        {
            Status = status;
            HttpStatusCode = httpStatusCode;
        }
    }

    /// <summary>
    /// Thin typed-HttpClient wrapper around Grow's Light Server API.
    /// Owns base URL resolution and JSON serialization. The API key /
    /// userId / pageCode live in the request body (not headers), so they
    /// are added by <see cref="GrowPaymentProvider"/> rather than here.
    /// </summary>
    public sealed class GrowApiClient
    {
        private readonly HttpClient _http;
        private readonly GrowOptions _opts;
        private readonly ILogger<GrowApiClient> _log;

        private static readonly JsonSerializerOptions JsonOpts = new()
        {
            PropertyNameCaseInsensitive = true,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
        };

        public GrowApiClient(HttpClient http, IOptions<GrowOptions> opts, ILogger<GrowApiClient> log)
        {
            _http = http;
            _opts = opts.Value;
            _log = log;

            _http.BaseAddress = new Uri(_opts.ResolveBaseUrl().TrimEnd('/') + "/");
            _http.DefaultRequestHeaders.Accept.Clear();
            _http.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            _log.LogInformation(
                "Grow client initialised: mode={Mode} base={Base} configured={Configured}",
                _opts.Mode, _http.BaseAddress, _opts.IsConfigured);
        }

        public async Task<GrowCreateProcessResponse> CreatePaymentProcessAsync(
            GrowCreateProcessRequest payload, CancellationToken ct)
        {
            using var content = new StringContent(
                JsonSerializer.Serialize(payload, JsonOpts), Encoding.UTF8, "application/json");

            using var resp = await _http.PostAsync(
                "api/light/server/1.0/createPaymentProcess", content, ct);

            var raw = await resp.Content.ReadAsStringAsync(ct);
            if (!resp.IsSuccessStatusCode)
            {
                _log.LogWarning(
                    "Grow createPaymentProcess failed: http={Http} body={Body}",
                    (int)resp.StatusCode, Truncate(raw, 800));
                throw new GrowApiException(
                    $"Grow returned HTTP {(int)resp.StatusCode}.",
                    httpStatusCode: (int)resp.StatusCode);
            }

            try
            {
                var parsed = JsonSerializer.Deserialize<GrowCreateProcessResponse>(raw, JsonOpts);
                if (parsed is null)
                    throw new GrowApiException("Grow returned an empty response.", httpStatusCode: (int)resp.StatusCode);
                return parsed;
            }
            catch (JsonException ex)
            {
                throw new GrowApiException("Failed to parse Grow response.", httpStatusCode: (int)resp.StatusCode, inner: ex);
            }
        }

        private static string Truncate(string s, int max) => s.Length <= max ? s : s[..max] + "…";
    }
}
