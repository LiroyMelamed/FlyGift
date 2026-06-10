using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Options;

namespace FlyGiftBackend.Services.Flights.Kiwi
{
    /// <summary>
    /// Translated Tequila failure carrying the upstream code so the
    /// controller can map to a Hebrew message without leaking raw English.
    /// </summary>
    public sealed class KiwiApiException : Exception
    {
        public string? Code { get; }
        public int? StatusCode { get; }
        public KiwiApiException(string message, string? code = null, int? statusCode = null, Exception? inner = null)
            : base(message, inner)
        {
            Code = code;
            StatusCode = statusCode;
        }
    }

    /// <summary>
    /// Thin typed-HttpClient wrapper around Tequila REST. Owns auth header
    /// injection and JSON deserialization. Registered via
    /// <c>AddHttpClient&lt;KiwiApiClient&gt;</c> so it picks up retry /
    /// circuit-breaker policies wired in Program.cs in the future.
    /// </summary>
    public sealed class KiwiApiClient
    {
        private readonly HttpClient _http;
        private readonly KiwiOptions _opts;
        private readonly ILogger<KiwiApiClient> _log;

        private static readonly JsonSerializerOptions JsonOpts = new()
        {
            PropertyNameCaseInsensitive = true,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
        };

        public KiwiApiClient(HttpClient http, IOptions<KiwiOptions> opts, ILogger<KiwiApiClient> log)
        {
            _http = http;
            _opts = opts.Value;
            _log = log;

            // Base URL is derived from KiwiOptions.Mode (Test|Production)
            // so the entire system flips environments via a single config
            // line — see KiwiOptions.ResolveBaseUrl. An explicit BaseUrl
            // override (proxy / on-prem mirror) still wins.
            _http.BaseAddress = new Uri(_opts.ResolveBaseUrl().TrimEnd('/') + "/");
            // Tequila auth: a single `apikey` request header (NOT Bearer).
            if (!_http.DefaultRequestHeaders.Contains("apikey"))
                _http.DefaultRequestHeaders.Add("apikey", _opts.ApiKey);
            _http.DefaultRequestHeaders.Accept.Clear();
            _http.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            _log.LogInformation(
                "Tequila client initialised: mode={Mode} base={Base} testPayments={Test} affiliate={Affiliate}",
                _opts.Mode, _http.BaseAddress, _opts.UseTestPayments, string.IsNullOrEmpty(_opts.AffiliateId) ? "(none)" : _opts.AffiliateId);
        }

        public async Task<TequilaSearchResponse> SearchAsync(
            IReadOnlyDictionary<string, string> query, CancellationToken ct)
        {
            // Stamp affiliate id (`partner` per Tequila docs) on every
            // search when one is configured. Required for revenue
            // attribution on the live endpoint; harmless on sandbox.
            var qs = string.Join("&", query.Select(kv =>
                $"{Uri.EscapeDataString(kv.Key)}={Uri.EscapeDataString(kv.Value)}"));
            if (!string.IsNullOrWhiteSpace(_opts.AffiliateId))
                qs += $"&partner={Uri.EscapeDataString(_opts.AffiliateId)}";

            using var resp = await _http.GetAsync($"v2/search?{qs}", ct);
            return await ReadJsonAsync<TequilaSearchResponse>(resp, ct);
        }

        /// <summary>
        /// GETs a Tequila Booking API endpoint with the given query params.
        /// Used for <c>/v2/booking/check_flights</c> which is documented as
        /// GET, not POST. The Tequila Booking API requires the
        /// <c>booking_token</c> from a fresh search response (max 30 min).
        /// </summary>
        public async Task<TResponse> GetJsonAsync<TResponse>(
            string path, IReadOnlyDictionary<string, string> query, CancellationToken ct)
            where TResponse : class
        {
            var qs = string.Join("&", query.Select(kv =>
                $"{Uri.EscapeDataString(kv.Key)}={Uri.EscapeDataString(kv.Value)}"));
            using var resp = await _http.GetAsync($"{path}?{qs}", ct);
            return await ReadJsonAsync<TResponse>(resp, ct);
        }

        /// <summary>
        /// GETs a Tequila endpoint and returns the raw JSON tree. Used by
        /// the booking flow to read <c>session_id</c> and baggage
        /// combinations that aren't fully modelled in our DTOs.
        /// </summary>
        public async Task<JsonNode> GetJsonNodeAsync(
            string path, IReadOnlyDictionary<string, string> query, CancellationToken ct)
        {
            var qs = string.Join("&", query.Select(kv =>
                $"{Uri.EscapeDataString(kv.Key)}={Uri.EscapeDataString(kv.Value)}"));
            using var resp = await _http.GetAsync($"{path}?{qs}", ct);
            return await ReadJsonNodeAsync(resp, ct);
        }

        /// <summary>
        /// POSTs JSON to a Tequila Booking API endpoint. Sets
        /// <c>Content-Type: application/json</c> per the docs prereq and,
        /// when the client is in <see cref="KiwiEnvironment.Test"/> mode,
        /// merges <c>test_payments: 1</c> into the payload root so no real
        /// money is moved during sandbox bookings.
        /// </summary>
        public async Task<TResponse> PostJsonAsync<TResponse>(
            string path, object payload, CancellationToken ct) where TResponse : class
        {
            // Round-trip through JsonNode so we can splice in test_payments
            // and partner without forcing every caller's DTO to know about
            // them. Tequila accepts unknown fields as no-ops.
            var node = System.Text.Json.Nodes.JsonNode.Parse(
                System.Text.Json.JsonSerializer.Serialize(payload, JsonOpts))
                ?? new System.Text.Json.Nodes.JsonObject();

            if (node is System.Text.Json.Nodes.JsonObject obj)
            {
                if (_opts.UseTestPayments) obj["test_payments"] = 1;
                if (!string.IsNullOrWhiteSpace(_opts.AffiliateId) && obj["partner"] is null)
                    obj["partner"] = _opts.AffiliateId;
            }

            using var content = new StringContent(
                node.ToJsonString(JsonOpts), System.Text.Encoding.UTF8, "application/json");
            using var resp = await _http.PostAsync(path, content, ct);
            return await ReadJsonAsync<TResponse>(resp, ct);
        }

        /// <summary>
        /// POSTs JSON and returns the raw response tree. Used for
        /// <c>save_booking</c> where Tequila returns <c>status</c> as either
        /// a string (<c>"success"</c>) or an integer.
        /// </summary>
        public async Task<JsonNode> PostJsonNodeAsync(
            string path, object payload, CancellationToken ct)
        {
            var node = JsonNode.Parse(JsonSerializer.Serialize(payload, JsonOpts))
                ?? new JsonObject();

            if (node is JsonObject obj)
            {
                if (_opts.UseTestPayments) obj["test_payments"] = 1;
                if (!string.IsNullOrWhiteSpace(_opts.AffiliateId) && obj["partner"] is null)
                    obj["partner"] = _opts.AffiliateId;
            }

            using var content = new StringContent(
                node.ToJsonString(JsonOpts), System.Text.Encoding.UTF8, "application/json");
            using var resp = await _http.PostAsync(path, content, ct);
            return await ReadJsonNodeAsync(resp, ct);
        }

        private async Task<JsonNode> ReadJsonNodeAsync(HttpResponseMessage resp, CancellationToken ct)
        {
            var raw = await resp.Content.ReadAsStringAsync(ct);
            if (!resp.IsSuccessStatusCode)
                ThrowTequilaError(resp, raw);

            try
            {
                return JsonNode.Parse(raw)
                    ?? throw new KiwiApiException("Tequila response empty.", "empty_response", (int)resp.StatusCode);
            }
            catch (JsonException ex)
            {
                throw new KiwiApiException("Failed to parse Tequila response.", "parse_error", (int)resp.StatusCode, ex);
            }
        }

        private async Task<T> ReadJsonAsync<T>(HttpResponseMessage resp, CancellationToken ct)
            where T : class
        {
            var raw = await resp.Content.ReadAsStringAsync(ct);
            if (!resp.IsSuccessStatusCode)
                ThrowTequilaError(resp, raw);

            try
            {
                var payload = JsonSerializer.Deserialize<T>(raw, JsonOpts);
                if (payload is null)
                    throw new KiwiApiException("Tequila response empty.", "empty_response", (int)resp.StatusCode);
                return payload;
            }
            catch (JsonException ex)
            {
                throw new KiwiApiException("Failed to parse Tequila response.", "parse_error", (int)resp.StatusCode, ex);
            }
        }

        private void ThrowTequilaError(HttpResponseMessage resp, string raw)
        {
            string? code = null, message = null;
            try
            {
                var err = JsonSerializer.Deserialize<TequilaError>(raw, JsonOpts);
                code = err?.Code;
                message = err?.Message ?? err?.Error;
            }
            catch { /* non-JSON error body — fall through */ }

            _log.LogWarning(
                "Tequila API call failed: status={Status} code={Code} message={Message} body={Body}",
                (int)resp.StatusCode, code, message, Truncate(raw, 800));

            throw new KiwiApiException(
                message ?? $"Tequila returned HTTP {(int)resp.StatusCode}.",
                code,
                (int)resp.StatusCode);
        }

        private static string Truncate(string s, int max) => s.Length <= max ? s : s[..max] + "…";
    }
}
