using System.Security.Claims;
using FlyGiftBackend.Data;
using FlyGiftBackend.Models;
using FlyGiftBackend.Services.Ledger;
using FlyGiftBackend.Services.Payments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlyGiftBackend.Controllers
{
    /// <summary>
    /// B2C wallet operations. Top-ups now use a hosted-page payment flow
    /// (Grow / Meshulam): the controller asks the gateway to create a
    /// payment session and returns the redirect URL. The frontend
    /// redirects the user; settlement is reflected in the wallet via the
    /// <see cref="GrowWebhookController"/> when Grow notifies us.
    /// </summary>
    [ApiController]
    [Authorize]
    [Route("api/[controller]")]
    public class WalletController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IBalanceService _balance;
        private readonly IPaymentProcessProvider _payments;
        private readonly IConfiguration _config;
        private readonly ILogger<WalletController> _log;

        public WalletController(
            AppDbContext db,
            IBalanceService balance,
            IPaymentProcessProvider payments,
            IConfiguration config,
            ILogger<WalletController> log)
        {
            _db = db;
            _balance = balance;
            _payments = payments;
            _config = config;
            _log = log;
        }

        private bool IsDemoPayments =>
            string.Equals(_config["Payments:Mode"], "Demo", StringComparison.OrdinalIgnoreCase)
            || _payments is DemoPaymentProcessProvider;

        private int CurrentUserId() =>
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        [HttpGet("Balance")]
        public async Task<IActionResult> GetBalance(CancellationToken ct)
        {
            var balance = await _balance.GetBalanceAsync(CurrentUserId(), ct);
            return Ok(new GeneralResponse(true, "OK", Request.Path, new { balance, currency = "ILS" }));
        }

        /// <summary>
        /// Initiates a wallet top-up. When Grow is configured, returns a
        /// hosted-page URL the frontend redirects to; the actual ledger
        /// credit happens via the Grow webhook on settlement (see
        /// <see cref="GrowWebhookController"/>). When Grow is NOT
        /// configured, returns a 503 with <c>code: payment_provider_not_configured</c>
        /// so the UI can render a "coming soon" state instead of failing
        /// silently.
        /// </summary>
        [HttpPost("Topup")]
        public async Task<IActionResult> Topup([FromBody] TopupRequest req, CancellationToken ct)
        {
            if (req == null || req.Amount <= 0)
                return BadRequest(new GeneralResponse(false, "סכום הטעינה חייב להיות גדול מאפס.", Request.Path));
            if (req.Amount > 1_000_000)
                return BadRequest(new GeneralResponse(false, "סכום הטעינה חורג מהמותר.", Request.Path));

            var userId = CurrentUserId();
            var currency = string.IsNullOrWhiteSpace(req.Currency) ? "ILS" : req.Currency.Trim().ToUpperInvariant();

            // Demo mode — instant wallet credit, no Grow redirect. Cards
            // starting with 4000 are declined; everything else succeeds.
            if (IsDemoPayments)
            {
                if (req.PaymentMethodToken?.Contains("decline", StringComparison.OrdinalIgnoreCase) == true)
                {
                    return BadRequest(new GeneralResponse(
                        false,
                        "הכרטיס נדחה (מצב הדגמה). נסו 4242 4242 4242 4242.",
                        Request.Path));
                }

                var chargeRef = Guid.NewGuid().ToString("N");
                var ledgerTxn = await _balance.PostAsync(new Services.Ledger.LedgerEntry
                {
                    UserId = userId,
                    Type = TransactionType.Load,
                    Amount = req.Amount,
                    Currency = currency,
                    Reference = chargeRef,
                    Description = "Wallet top-up (demo)",
                }, ct);
                await _db.SaveChangesAsync(ct);

                var demoBalance = await _balance.GetBalanceAsync(userId, ct);
                var digits = new string((req.PaymentMethodToken ?? "4242").Where(char.IsDigit).ToArray());
                var last4 = digits.Length >= 4 ? digits[^4..] : "4242";

                _log.LogInformation(
                    "Demo wallet top-up credited user {UserId} with {Amount} {Currency}",
                    userId, req.Amount, currency);

                return Ok(new GeneralResponse(true, "הטעינה הושלמה (מצב הדגמה).", Request.Path, new
                {
                    chargeId = ledgerTxn.Id.ToString(),
                    brand = "Visa",
                    last4,
                    balance = demoBalance,
                    currency,
                    demo = true,
                }));
            }

            // Provider not configured (Grow credentials missing) → 503 so
            // the frontend renders a "coming soon" state. The DI container
            // wires up DisabledPaymentProcessProvider as the fallback.
            if (!_payments.IsConfigured)
            {
                _log.LogWarning(
                    "Wallet top-up attempted by user {UserId} for {Amount} {Currency} — Grow not configured.",
                    userId, req.Amount, currency);
                return StatusCode(503, new GeneralResponse(
                    false,
                    "תשלומי כרטיס טרם מחוברים. החיבור ל-Grow בתהליך אישור.",
                    Request.Path,
                    new { code = "payment_provider_not_configured" }));
            }

            var user = await _db.Users
                .AsNoTracking()
                .Where(u => u.Id == userId)
                .Select(u => new { u.Email, u.FirstName, u.LastName, u.UserName })
                .FirstOrDefaultAsync(ct);

            // ExternalReference travels through Grow as cField1 and comes
            // back on the webhook so we know which user to credit. Format
            // is `wallet:{userId}:{nonce}` — the nonce makes every top-up
            // attempt uniquely traceable for support.
            var externalRef = $"wallet:{userId}:{Guid.NewGuid():N}";

            var displayName = string.Join(" ", new[] { user?.FirstName, user?.LastName }
                .Where(s => !string.IsNullOrWhiteSpace(s))).Trim();
            if (string.IsNullOrWhiteSpace(displayName)) displayName = user?.UserName ?? "FlyGift user";

            var process = await _payments.CreatePaymentProcessAsync(new PaymentProcessRequest
            {
                UserId = userId,
                Sum = req.Amount,
                Currency = currency,
                PaymentNum = req.PaymentNum > 0 ? req.PaymentNum : 1,
                Description = $"FlyGift wallet top-up #{userId}",
                CustomerName = displayName,
                CustomerEmail = user?.Email,
                ExternalReference = externalRef,
                // SuccessUrl/CancelUrl default to the values configured on
                // GrowOptions; callers can override per-request when the
                // top-up modal hands us return URLs.
                SuccessUrl = req.SuccessUrl ?? "",
                CancelUrl = req.CancelUrl ?? "",
            }, ct);

            if (!process.Success || string.IsNullOrWhiteSpace(process.Url))
            {
                _log.LogWarning(
                    "Grow refused createPaymentProcess for user {UserId}: {Reason}",
                    userId, process.FailureReason);
                return StatusCode(502, new GeneralResponse(
                    false,
                    string.IsNullOrWhiteSpace(process.FailureReason)
                        ? "לא הצלחנו ליצור עמוד תשלום. נסו שוב."
                        : process.FailureReason,
                    Request.Path,
                    new { code = "payment_process_failed" }));
            }

            return Ok(new GeneralResponse(true, "עמוד התשלום נוצר.", Request.Path, new
            {
                url = process.Url,
                processId = process.ProcessId,
                expiresAt = process.ExpiresAt,
                externalReference = externalRef,
                currency,
            }));
        }

        public class TopupRequest
        {
            public decimal Amount { get; set; }
            public string Currency { get; set; } = "ILS";
            /// <summary>Demo-mode card token. Any value except *decline* succeeds.</summary>
            public string? PaymentMethodToken { get; set; }
            /// <summary>Number of installments (Grow paymentNum). Defaults to 1.</summary>
            public int PaymentNum { get; set; } = 1;
            /// <summary>Optional override of the configured Grow successUrl.</summary>
            public string? SuccessUrl { get; set; }
            /// <summary>Optional override of the configured Grow cancelUrl.</summary>
            public string? CancelUrl { get; set; }
        }
    }
}
