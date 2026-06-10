using System.Globalization;
using System.Text.Json;
using FlyGiftBackend.Models;
using FlyGiftBackend.Services.Ledger;
using FlyGiftBackend.Services.Payments.Grow;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace FlyGiftBackend.Controllers
{
    /// <summary>
    /// Settlement webhook for Grow. Grow POSTs here whenever a hosted-page
    /// transaction completes (configured as <c>notifyUrl</c> /
    /// <c>invoiceNotifyUrl</c> on the createPaymentProcess request).
    ///
    /// On a successful payment we:
    ///   1. Verify the payload's <c>apiKey</c> matches the configured
    ///      Grow API key (per Grow's docs that's the integrity check —
    ///      no HMAC signature header is involved).
    ///   2. Resolve the FlyGift user from the <c>cField1</c> echo we
    ///      planted as <see cref="WalletController.Topup"/>'s
    ///      <c>externalReference</c>.
    ///   3. Idempotently post a <c>Load</c> ledger entry, keyed on Grow's
    ///      <c>transactionId</c> so retries are no-ops.
    ///
    /// Scaffold notes — pending real Grow credentials we cannot end-to-end
    /// test the exact payload field names. The shape modelled in
    /// <see cref="GrowWebhookPayload"/> follows Grow's published reference;
    /// log the raw body on first arrival so we can lock the names down.
    /// </summary>
    [ApiController]
    [Route("api/Grow/[action]")]
    [AllowAnonymous] // shared-secret auth (apiKey field) is the auth
    public class GrowWebhookController : ControllerBase
    {
        private readonly Data.AppDbContext _db;
        private readonly IBalanceService _balance;
        private readonly GrowOptions _opts;
        private readonly ILogger<GrowWebhookController> _log;

        private static readonly JsonSerializerOptions JsonOpts = new()
        {
            PropertyNameCaseInsensitive = true,
        };

        public GrowWebhookController(
            Data.AppDbContext db,
            IBalanceService balance,
            IOptions<GrowOptions> opts,
            ILogger<GrowWebhookController> log)
        {
            _db = db;
            _balance = balance;
            _opts = opts.Value;
            _log = log;
        }

        [HttpPost]
        public async Task<IActionResult> Webhook(CancellationToken ct)
        {
            // Read the raw body once — Grow may POST as form-encoded or
            // JSON depending on page configuration; we accept both.
            string raw;
            using (var reader = new StreamReader(Request.Body))
                raw = await reader.ReadToEndAsync(ct);

            if (!_opts.IsConfigured)
            {
                _log.LogWarning("Grow webhook received but Grow:ApiKey is not configured. body={Body}",
                    Truncate(raw, 800));
                return StatusCode(503, new { error = "grow not configured" });
            }

            GrowWebhookPayload? payload = TryParsePayload(raw);
            if (payload is null)
            {
                _log.LogWarning("Grow webhook: could not parse body. body={Body}", Truncate(raw, 800));
                return BadRequest(new { error = "invalid payload" });
            }

            // Shared-secret auth: Grow echoes our apiKey back on the
            // webhook. Reject anything else so attackers can't post fake
            // top-ups to the endpoint.
            var bodyApiKey = ExtractField(raw, "apiKey");
            if (string.IsNullOrWhiteSpace(bodyApiKey)
                || !string.Equals(bodyApiKey, _opts.ApiKey, StringComparison.Ordinal))
            {
                _log.LogWarning("Grow webhook: apiKey mismatch. transactionId={TxId}", payload.TransactionId);
                return Unauthorized(new { error = "apiKey mismatch" });
            }

            // Status "1" = success per Grow docs. Anything else: log and
            // ack so Grow doesn't retry forever.
            if (!string.Equals(payload.Status, "1", StringComparison.Ordinal))
            {
                _log.LogInformation(
                    "Grow webhook non-success status. status={Status} transactionId={TxId} cField1={Ref}",
                    payload.Status, payload.TransactionId, payload.ExternalReference);
                return Ok(new { received = true, applied = false });
            }

            if (string.IsNullOrWhiteSpace(payload.TransactionId))
            {
                _log.LogWarning("Grow webhook: missing transactionId. body={Body}", Truncate(raw, 400));
                return BadRequest(new { error = "missing transactionId" });
            }

            // Resolve the FlyGift user from cField1 we planted on
            // createPaymentProcess (`wallet:{userId}:{nonce}`). The colon
            // split is unambiguous because GUID nonces don't contain colons.
            int? userId = ParseUserIdFromReference(payload.ExternalReference);
            if (userId is null)
            {
                _log.LogWarning(
                    "Grow webhook: could not resolve user from reference. cField1={Ref} transactionId={TxId}",
                    payload.ExternalReference, payload.TransactionId);
                return Ok(new { received = true, applied = false, reason = "unresolved_reference" });
            }

            if (payload.Sum is null || payload.Sum <= 0)
            {
                _log.LogWarning(
                    "Grow webhook: missing/invalid sum. transactionId={TxId} cField1={Ref}",
                    payload.TransactionId, payload.ExternalReference);
                return BadRequest(new { error = "invalid sum" });
            }

            // Idempotency: if we've already credited this exact Grow
            // transaction, no-op. The transactionId lands in the ledger's
            // Reference column with a stable prefix so the lookup is index-cheap.
            var ledgerRef = $"grow:tx:{payload.TransactionId}";
            var alreadyApplied = await _db.Transactions
                .AsNoTracking()
                .AnyAsync(t => t.TransactionReference == ledgerRef, ct);
            if (alreadyApplied)
            {
                _log.LogInformation("Grow webhook: duplicate {TxId} — skipping.", payload.TransactionId);
                return Ok(new { received = true, applied = false, reason = "duplicate" });
            }

            await _balance.PostAsync(new LedgerEntry
            {
                UserId = userId.Value,
                Type = TransactionType.Load,
                Amount = payload.Sum.Value,
                Currency = "ILS",
                Reference = ledgerRef,
                Description = $"Wallet top-up · Grow transaction {payload.TransactionId}",
            }, ct);

            _log.LogInformation(
                "Grow webhook credited user {UserId} with {Amount} ILS (transactionId={TxId})",
                userId.Value, payload.Sum.Value, payload.TransactionId);

            return Ok(new { received = true, applied = true });
        }

        private static GrowWebhookPayload? TryParsePayload(string raw)
        {
            if (string.IsNullOrWhiteSpace(raw)) return null;
            try
            {
                if (raw.TrimStart().StartsWith('{'))
                    return JsonSerializer.Deserialize<GrowWebhookPayload>(raw, JsonOpts);

                // Form-encoded fallback: Grow sometimes sends application/x-www-form-urlencoded.
                var dict = raw.Split('&', StringSplitOptions.RemoveEmptyEntries)
                    .Select(part => part.Split('=', 2))
                    .Where(kv => kv.Length == 2)
                    .ToDictionary(kv => Uri.UnescapeDataString(kv[0]), kv => Uri.UnescapeDataString(kv[1]));

                return new GrowWebhookPayload
                {
                    Status = dict.TryGetValue("status", out var s) ? s : null,
                    TransactionId = dict.TryGetValue("transactionId", out var tx) ? tx : null,
                    ProcessId = dict.TryGetValue("processId", out var pid) ? pid : null,
                    ProcessToken = dict.TryGetValue("processToken", out var ptk) ? ptk : null,
                    Sum = dict.TryGetValue("sum", out var sum) && decimal.TryParse(sum, NumberStyles.Number, CultureInfo.InvariantCulture, out var d) ? d : null,
                    ExternalReference = dict.TryGetValue("cField1", out var c1) ? c1 : null,
                    Asmachta = dict.TryGetValue("asmachta", out var a) ? a : null,
                    PaymentDate = dict.TryGetValue("paymentDate", out var pd) ? pd : null,
                    PaymentType = dict.TryGetValue("paymentType", out var pt) ? pt : null,
                    PayerName = dict.TryGetValue("payerName", out var pn) ? pn : null,
                    PayerPhone = dict.TryGetValue("payerPhone", out var pp) ? pp : null,
                    PayerEmail = dict.TryGetValue("payerEmail", out var pe) ? pe : null,
                    TransactionTypeId = dict.TryGetValue("transactionTypeId", out var tti) ? tti : null,
                };
            }
            catch
            {
                return null;
            }
        }

        private static string? ExtractField(string raw, string fieldName)
        {
            if (string.IsNullOrWhiteSpace(raw)) return null;
            try
            {
                if (raw.TrimStart().StartsWith('{'))
                {
                    using var doc = JsonDocument.Parse(raw);
                    if (doc.RootElement.TryGetProperty(fieldName, out var v))
                        return v.ValueKind == JsonValueKind.String ? v.GetString() : v.ToString();
                    return null;
                }
                var match = raw.Split('&', StringSplitOptions.RemoveEmptyEntries)
                    .Select(part => part.Split('=', 2))
                    .FirstOrDefault(kv => kv.Length == 2 && string.Equals(kv[0], fieldName, StringComparison.OrdinalIgnoreCase));
                return match is null ? null : Uri.UnescapeDataString(match[1]);
            }
            catch
            {
                return null;
            }
        }

        private static int? ParseUserIdFromReference(string? reference)
        {
            if (string.IsNullOrWhiteSpace(reference)) return null;
            // Format: "wallet:{userId}:{nonce}"
            var parts = reference.Split(':');
            if (parts.Length < 2 || !string.Equals(parts[0], "wallet", StringComparison.Ordinal)) return null;
            return int.TryParse(parts[1], NumberStyles.Integer, CultureInfo.InvariantCulture, out var id) ? id : null;
        }

        private static string Truncate(string s, int max) => s.Length <= max ? s : s[..max] + "…";
    }
}
