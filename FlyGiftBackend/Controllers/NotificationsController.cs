using System.Security.Claims;
using FlyGiftBackend.Data;
using FlyGiftBackend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlyGiftBackend.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/[controller]")]
    public class NotificationsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public NotificationsController(AppDbContext db) => _db = db;

        private int GetCurrentUserId() =>
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        public record NotificationDto(
            int Id,
            string Type,
            string Title,
            string? Body,
            string? Href,
            DateTime CreatedAt,
            DateTime? ReadAt);

        public record MineResponse(
            IEnumerable<NotificationDto> Items,
            int UnreadCount);

        /// <summary>
        /// Returns the most recent N notifications for the current user
        /// plus an unread counter for the bell badge.
        /// </summary>
        [HttpGet("Mine")]
        public async Task<ActionResult<GeneralResponse>> Mine(
            [FromQuery] int take = 30,
            CancellationToken ct = default)
        {
            take = Math.Clamp(take, 1, 100);
            var userId = GetCurrentUserId();

            var rows = await _db.Notifications
                .AsNoTracking()
                .Where(n => n.UserId == userId)
                .OrderByDescending(n => n.CreatedAt)
                .Take(take)
                .Select(n => new NotificationDto(
                    n.Id, n.Type, n.Title, n.Body, n.Href, n.CreatedAt, n.ReadAt))
                .ToListAsync(ct);

            var unread = await _db.Notifications
                .AsNoTracking()
                .CountAsync(n => n.UserId == userId && n.ReadAt == null, ct);

            return Ok(new GeneralResponse(true, "OK", Request.Path,
                new MineResponse(rows, unread)));
        }

        /// <summary>Marks one notification as read.</summary>
        [HttpPost("{id:int}/Read")]
        public async Task<ActionResult<GeneralResponse>> MarkRead(
            int id, CancellationToken ct = default)
        {
            var userId = GetCurrentUserId();
            var n = await _db.Notifications
                .FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);
            if (n == null)
                return NotFound(new GeneralResponse(false, "ההתראה לא נמצאה.", Request.Path));

            if (n.ReadAt == null)
            {
                n.ReadAt = DateTime.UtcNow;
                await _db.SaveChangesAsync(ct);
            }
            return Ok(new GeneralResponse(true, "OK", Request.Path));
        }

        /// <summary>Marks every unread notification for the user as read.</summary>
        [HttpPost("ReadAll")]
        public async Task<ActionResult<GeneralResponse>> ReadAll(CancellationToken ct = default)
        {
            var userId = GetCurrentUserId();
            var now = DateTime.UtcNow;
            var affected = await _db.Notifications
                .Where(n => n.UserId == userId && n.ReadAt == null)
                .ExecuteUpdateAsync(s => s.SetProperty(n => n.ReadAt, _ => now), ct);

            return Ok(new GeneralResponse(true, "OK", Request.Path, new { updated = affected }));
        }
    }
}
