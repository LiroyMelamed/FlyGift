using System.Security.Claims;
using FlyGiftBackend.Data;
using FlyGiftBackend.Models;
using FlyGiftBackend.Services.Billing;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlyGiftBackend.Controllers
{
    /// <summary>
    /// B2B billing read APIs — exposes the per-batch invoices generated
    /// by Stage 17's <c>IInvoiceProvider</c>.
    /// </summary>
    [ApiController]
    [Authorize(Roles = nameof(UserRole.Company) + "," + nameof(UserRole.Admin))]
    [Route("api/Company/[controller]")]
    public class BillingController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IInvoiceProvider _invoices;

        public BillingController(AppDbContext db, IInvoiceProvider invoices)
        {
            _db = db;
            _invoices = invoices;
        }

        private int GetCurrentUserId() =>
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        public class InvoiceDto
        {
            public int Id { get; set; }
            public Guid BatchId { get; set; }
            public string? InvoiceNumber { get; set; }
            public string? InvoiceUrl { get; set; }
            public int RecipientCount { get; set; }
            public decimal TotalCharged { get; set; }
            public string Currency { get; set; } = "ILS";
            public BulkOrderStatus Status { get; set; }
            public DateTime CreatedAt { get; set; }
            public DateTime? InvoicedAt { get; set; }
        }

        [HttpGet("Invoices")]
        public async Task<IActionResult> Invoices(
            [FromQuery] int take = 50,
            CancellationToken ct = default)
        {
            take = Math.Clamp(take, 1, 200);
            var userId = GetCurrentUserId();
            var rows = await _db.BulkOrders
                .AsNoTracking()
                .Where(o => o.CompanyUserId == userId)
                .OrderByDescending(o => o.CreatedAt)
                .Take(take)
                .Select(o => new InvoiceDto
                {
                    Id = o.Id,
                    BatchId = o.BatchId,
                    InvoiceNumber = o.InvoiceNumber,
                    InvoiceUrl = o.InvoiceUrl,
                    RecipientCount = o.RecipientCount,
                    TotalCharged = o.TotalCharged,
                    Currency = o.Currency,
                    Status = o.Status,
                    CreatedAt = o.CreatedAt,
                    InvoicedAt = o.InvoicedAt,
                })
                .ToListAsync(ct);

            var totalInvoiced = rows.Where(r => r.Status == BulkOrderStatus.Invoiced).Sum(r => r.TotalCharged);

            return Ok(new GeneralResponse(true, "OK", Request.Path, new
            {
                invoices = rows,
                summary = new
                {
                    count = rows.Count,
                    totalInvoiced,
                    pending = rows.Count(r => r.Status == BulkOrderStatus.Pending),
                    failed = rows.Count(r => r.Status == BulkOrderStatus.Failed),
                }
            }));
        }

        /// <summary>
        /// Renders a mock invoice page for the given invoice number. The
        /// MockInvoiceProvider returns a URL pointing here instead of the
        /// retired `invoices.flygift.app` domain, so clicking PDF links
        /// from DepositModal and the Billing table actually loads on
        /// localhost. Anonymous so users without an active session can
        /// still open a saved link.
        /// </summary>
        [HttpGet("Invoices/Mock/{number}")]
        [AllowAnonymous]
        public IActionResult MockInvoice(string number)
        {
            var safeNumber = System.Net.WebUtility.HtmlEncode(number ?? "");
            var html = $@"<!doctype html>
<html lang=""he"" dir=""rtl"">
<head>
<meta charset=""utf-8"" />
<title>FlyGift · חשבונית {safeNumber}</title>
<style>
  body {{ font-family: -apple-system, ""Segoe UI"", Arial, sans-serif; background:#0D1B2A; color:#0D1B2A; margin:0; padding:24px; }}
  .doc {{ max-width: 720px; margin: 0 auto; background:#fff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,.25); }}
  .head {{ background: linear-gradient(135deg, #0D1B2A 0%, #112538 100%); color:#F2C55C; padding: 24px; }}
  .brand {{ font-size: 11px; letter-spacing: .25em; text-transform: uppercase; opacity:.85; }}
  .title {{ font-size: 28px; font-weight: 700; margin-top: 8px; color:#fff; }}
  .num {{ font-family: ui-monospace, ""SF Mono"", Menlo, monospace; opacity:.85; margin-top: 8px; }}
  .body {{ padding: 32px 24px; line-height: 1.6; }}
  .row {{ display:flex; justify-content:space-between; padding: 8px 0; border-bottom: 1px dashed #cbd5e1; }}
  .footer {{ padding: 16px 24px; background:#F1F3F5; font-size: 11px; color:#64748b; text-align:center; letter-spacing:.12em; text-transform: uppercase; }}
</style>
</head>
<body>
  <div class=""doc"">
    <div class=""head"">
      <div class=""brand"">FlyGift · חשבונית מס</div>
      <div class=""title"">חשבונית מספר</div>
      <div class=""num"">{safeNumber}</div>
    </div>
    <div class=""body"">
      <p>זוהי חשבונית הדגמה (Mock Invoice) לטובת בדיקות מקומיות. בסביבת הפרודקשן הקובץ ייווצר על ידי ספק החיוב (Grow) והקישור הזה יחליף את העמוד הזה אוטומטית.</p>
      <div class=""row""><span>מספר חשבונית</span><span style=""font-family:ui-monospace,monospace"">{safeNumber}</span></div>
      <div class=""row""><span>תאריך הפקה</span><span>{DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC</span></div>
      <div class=""row""><span>ספק</span><span>Mock Provider (Dev)</span></div>
    </div>
    <div class=""footer"">FlyGift · Mock environment · לא לשימוש פיננסי בפועל</div>
  </div>
</body>
</html>";
            return Content(html, "text/html; charset=utf-8");
        }

        /// <summary>Issues a 302 redirect to the underlying provider URL so we can audit downloads.</summary>
        [HttpGet("Invoices/{id:int}/Download")]
        public async Task<IActionResult> Download(int id, CancellationToken ct)
        {
            var userId = GetCurrentUserId();
            var order = await _db.BulkOrders
                .AsNoTracking()
                .FirstOrDefaultAsync(o => o.Id == id && o.CompanyUserId == userId, ct);

            if (order == null)
                return NotFound(new GeneralResponse(false, "החשבונית לא נמצאה.", Request.Path));
            if (string.IsNullOrWhiteSpace(order.InvoiceUrl))
                return BadRequest(new GeneralResponse(false, "החשבונית טרם הופקה.", Request.Path));

            return Redirect(order.InvoiceUrl);
        }

        public class DepositRequest
        {
            public decimal Amount { get; set; }
            public string Currency { get; set; } = "ILS";
        }

        public class DepositResponse
        {
            public bool Success { get; set; }
            public string InvoiceNumber { get; set; } = "";
            public string Url { get; set; } = "";
            public DateTime IssuedAt { get; set; }
            public decimal Total { get; set; }
            public string Currency { get; set; } = "ILS";
        }

        /// <summary>
        /// Generate a top-up invoice/payment request for a Company account.
        /// Delegates to <see cref="IInvoiceProvider"/> (Mock today; real
        /// Grow hosted-page invoice later) and returns the invoice URL the
        /// frontend renders as a download link.
        /// </summary>
        [HttpPost("Deposit")]
        public async Task<IActionResult> Deposit(
            [FromBody] DepositRequest request,
            CancellationToken ct = default)
        {
            if (request == null || request.Amount <= 0)
                return BadRequest(new GeneralResponse(false, "סכום הטעינה חייב להיות גדול מאפס.", Request.Path));
            if (request.Amount > 1_000_000)
                return BadRequest(new GeneralResponse(false, "סכום הטעינה חורג מהמותר.", Request.Path));
            if (string.IsNullOrWhiteSpace(request.Currency))
                request.Currency = "ILS";

            var userId = GetCurrentUserId();
            var company = await _db.Users
                .AsNoTracking()
                .Where(u => u.Id == userId)
                .Select(u => new { u.Email, u.FirstName, u.UserName })
                .FirstOrDefaultAsync(ct);

            // ExternalReference is the correlation id we'll forward to
            // Grow's createPaymentProcess as `cField1` (per their docs)
            // so the webhook can credit the right FlyGift wallet when the
            // payment is settled.
            var result = await _invoices.GenerateAsync(new InvoiceRequest
            {
                CompanyUserId = userId,
                CompanyName = company?.FirstName ?? company?.UserName ?? "Company",
                CompanyEmail = company?.Email,
                Currency = request.Currency,
                ExternalReference = $"deposit:{userId}:{Guid.NewGuid():N}",
                Lines = new List<InvoiceLine>
                {
                    new()
                    {
                        Description = "טעינת יתרה לחשבון החברה",
                        Quantity = 1,
                        UnitAmount = request.Amount,
                    },
                },
            }, ct);

            if (!result.Success)
                return StatusCode(502, new GeneralResponse(false,
                    result.FailureReason ?? "הפקת החשבונית נכשלה.", Request.Path));

            return Ok(new GeneralResponse(true, "החשבונית הופקה.", Request.Path,
                new DepositResponse
                {
                    Success = true,
                    InvoiceNumber = result.InvoiceNumber,
                    Url = result.Url,
                    IssuedAt = result.IssuedAt,
                    Total = result.Total,
                    Currency = request.Currency,
                }));
        }
    }
}
