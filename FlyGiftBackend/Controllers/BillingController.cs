using System.Security.Claims;
using FlyGiftBackend.Data;
using FlyGiftBackend.Models;
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

        public BillingController(AppDbContext db) => _db = db;

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
            public string Currency { get; set; } = "USD";
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

        /// <summary>Issues a 302 redirect to the underlying provider URL so we can audit downloads.</summary>
        [HttpGet("Invoices/{id:int}/Download")]
        public async Task<IActionResult> Download(int id, CancellationToken ct)
        {
            var userId = GetCurrentUserId();
            var order = await _db.BulkOrders
                .AsNoTracking()
                .FirstOrDefaultAsync(o => o.Id == id && o.CompanyUserId == userId, ct);

            if (order == null)
                return NotFound(new GeneralResponse(false, "Invoice not found.", Request.Path));
            if (string.IsNullOrWhiteSpace(order.InvoiceUrl))
                return BadRequest(new GeneralResponse(false, "Invoice not yet generated.", Request.Path));

            return Redirect(order.InvoiceUrl);
        }
    }
}
