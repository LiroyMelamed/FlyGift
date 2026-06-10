using System.Security.Claims;
using FlyGiftBackend.Data;
using FlyGiftBackend.Models;
using FlyGiftBackend.Repositories;
using FlyGiftBackend.Responses.GiftCards;
using FlyGiftBackend.Services;
using FlyGiftBackend.Services.Ledger;
using FlyGiftBackend.Services.Notifications;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FlyGiftBackend.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/[controller]")]
    public class GiftCardController : ControllerBase
    {
        private readonly GiftCardRepository _giftCards;
        private readonly TransactionRepository _transactions;
        private readonly AuthRepository _users;
        private readonly AppDbContext _db;
        private readonly IIdempotencyService _idem;
        private readonly IBalanceService _balance;
        private readonly INotificationStore _notify;

        public GiftCardController(
            GiftCardRepository giftCards,
            TransactionRepository transactions,
            AuthRepository users,
            AppDbContext db,
            IIdempotencyService idem,
            IBalanceService balance,
            INotificationStore notify)
        {
            _giftCards = giftCards;
            _transactions = transactions;
            _users = users;
            _db = db;
            _idem = idem;
            _balance = balance;
            _notify = notify;
        }

        private int GetCurrentUserId()
        {
            var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.Parse(idClaim!);
        }

        [HttpPost("Purchase")]
        public async Task<GiftCardResponse> Purchase([FromBody] CreateGiftCardRequest request)
        {
            var senderId = GetCurrentUserId();

            // ----- Idempotency -----
            // Clients should send a UUID per logical "send" action.
            // Same key + same user => return the original result, never charge twice.
            var idemKey = Request.Headers["Idempotency-Key"].ToString();
            if (!string.IsNullOrWhiteSpace(idemKey))
            {
                if (idemKey.Length > 128)
                {
                    return new GiftCardResponse(
                        new GeneralResponse(false, "מפתח Idempotency ארוך מדי.", HttpContext.Request.Path),
                        null);
                }
                if (_idem.TryGet<GiftCardResponse>("giftcard.purchase", senderId, idemKey, out var cached) && cached != null)
                {
                    Response.Headers["Idempotent-Replay"] = "true";
                    return cached;
                }
            }

            // ----- Validation (outside the transaction so retries are
            // pure DB work, not user-input checks). -----
            if (request.Amount <= 0)
                return new GiftCardResponse(
                    new GeneralResponse(false, "הסכום חייב להיות גדול מאפס.", HttpContext.Request.Path), null);

            if (string.IsNullOrWhiteSpace(request.Currency))
                return new GiftCardResponse(
                    new GeneralResponse(false, "שדה המטבע חסר.", HttpContext.Request.Path), null);

            if (request.ExpirationDate <= DateTime.UtcNow)
                return new GiftCardResponse(
                    new GeneralResponse(false, "תאריך התפוגה חייב להיות עתידי.", HttpContext.Request.Path), null);

            // Recipient resolution: either an internal user (RecipientId)
            // OR an external party (RecipientEmail+RecipientName). When
            // both are present, RecipientId wins and the email/name are
            // stored as a denormalized contact snapshot.
            int? resolvedRecipientId = (request.RecipientId > 0) ? request.RecipientId : null;
            string? resolvedEmail = string.IsNullOrWhiteSpace(request.RecipientEmail) ? null : request.RecipientEmail.Trim();
            string? resolvedName = string.IsNullOrWhiteSpace(request.RecipientName) ? null : request.RecipientName.Trim();

            if (resolvedRecipientId == null && resolvedEmail == null)
                return new GiftCardResponse(
                    new GeneralResponse(false, "חסרים פרטי הנמען (מזהה או דוא״ל).", HttpContext.Request.Path), null);

            if (resolvedRecipientId != null)
            {
                if (resolvedRecipientId == senderId)
                    return new GiftCardResponse(
                        new GeneralResponse(false, "לא ניתן לשלוח מתנה לעצמך.", HttpContext.Request.Path), null);

                var recipient = _users.GetEntityById(resolvedRecipientId.Value);
                if (recipient == null)
                    return new GiftCardResponse(
                        new GeneralResponse(false, "הנמען לא נמצא.", HttpContext.Request.Path), null);
            }
            else
            {
                // Email-only path: still block self-sends by comparing
                // against the sender's own email (case-insensitive).
                if (resolvedName == null)
                    return new GiftCardResponse(
                        new GeneralResponse(false, "חובה לציין את שם הנמען בשליחה לפי דוא״ל.", HttpContext.Request.Path), null);

                var sender = _users.GetEntityById(senderId);
                if (sender?.Email != null &&
                    string.Equals(sender.Email, resolvedEmail, StringComparison.OrdinalIgnoreCase))
                    return new GiftCardResponse(
                        new GeneralResponse(false, "לא ניתן לשלוח מתנה לעצמך.", HttpContext.Request.Path), null);
            }

            // ----- Funding check (the fix) -----
            // Issuing a gift card MUST debit the sender's wallet. The pre-fix
            // ledger was posting `Load` (credit) on issuance, which conjured
            // money out of thin air. We now require the sender to hold at
            // least `Amount` in their ledger before the issuance proceeds.
            // Top-up flow for companies: POST /api/Company/Billing/Deposit.
            var ledgerBalance = await _balance.GetBalanceAsync(senderId, HttpContext.RequestAborted);
            if (ledgerBalance < request.Amount)
            {
                return new GiftCardResponse(
                    new GeneralResponse(
                        false,
                        $"יתרה לא מספקת. ביתרת הארנק יש {ledgerBalance:0.00} {request.Currency}, " +
                        $"אך נדרשים {request.Amount:0.00} {request.Currency} לרכישת המתנה.",
                        HttpContext.Request.Path,
                        new { code = "insufficient_balance", available = ledgerBalance, required = request.Amount, currency = request.Currency }),
                    null);
            }

            // Wrap the DB work in the execution strategy so EnableRetryOnFailure
            // can replay the transaction on transient Npgsql failures.
            var strategy = _db.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                await using var tx = await _db.Database.BeginTransactionAsync();
                try
                {
                    var card = new GiftCard
                    {
                        SenderId = senderId,
                        RecipientId = resolvedRecipientId,
                        RecipientEmail = resolvedEmail,
                        RecipientName = resolvedName,
                        Amount = request.Amount,
                        Currency = request.Currency,
                        ExpirationDate = request.ExpirationDate,
                        Status = GiftCardStatus.Active,
                        ShortCode = await GenerateUniqueShortCodeAsync(),
                        FlightSnapshot = request.FlightSnapshot,
                        CreatedAt = DateTime.UtcNow
                    };

                    _db.GiftCards.Add(card);
                    await _db.SaveChangesAsync();

                    var recipientLabel = resolvedRecipientId?.ToString() ?? resolvedEmail ?? "external";
                    // Spend = debit. The sender's wallet drops by Amount.
                    // The recipient gets credit (Load) when they redeem the
                    // card, which posts a separate ledger entry to *their*
                    // user id — see Redeem() below. This keeps total ledger
                    // value flat: -Amount sender, +Amount recipient.
                    await _balance.PostAsync(new LedgerEntry
                    {
                        UserId = senderId,
                        Type = TransactionType.Spend,
                        Amount = request.Amount,
                        Currency = request.Currency,
                        RelatedGiftCardId = card.Id,
                        Reference = $"giftcard:{card.Id}",
                        Description = $"Issued gift card #{card.Id} to {recipientLabel}",
                    });

                    await tx.CommitAsync();

                    var response = new GiftCardResponse(
                        new GeneralResponse(true, "כרטיס המתנה נרכש בהצלחה.", HttpContext.Request.Path),
                        card);

                    if (!string.IsNullOrWhiteSpace(idemKey))
                        _idem.Save("giftcard.purchase", senderId, idemKey, response);

                    // Activity feed — outside the strategy/tx so a notification
                    // glitch can't undo a successful purchase.
                    var notifyTarget = resolvedName ?? resolvedEmail ?? "הנמען";
                    await _notify.CreateAsync(
                        senderId,
                        "giftcard.sent",
                        $"מתנה נשלחה ל{notifyTarget}",
                        $"₪{card.Amount:0.00} {card.Currency} · קוד {card.ShortCode}",
                        $"/gifts/{card.ShortCode}");
                    if (resolvedRecipientId.HasValue)
                    {
                        await _notify.CreateAsync(
                            resolvedRecipientId.Value,
                            "giftcard.received",
                            "קיבלת מתנה חדשה",
                            $"{card.Amount:0.00} {card.Currency} · קוד {card.ShortCode}",
                            $"/gifts/{card.ShortCode}");
                    }

                    return response;
                }
                catch (Exception ex)
                {
                    await tx.RollbackAsync();
                    return new GiftCardResponse(
                        new GeneralResponse(false, "שגיאת שרת פנימית: " + ex.Message, HttpContext.Request.Path),
                        null);
                }
            });
        }

        [HttpPost("Redeem")]
        public async Task<GiftCardResponse> Redeem([FromBody] RedeemGiftCardRequest request)
        {
            // Npgsql retry-on-failure forbids user-managed transactions
            // unless they're driven by an execution strategy that can
            // replay the whole unit. Wrap the body so a transient failure
            // re-runs Begin/Commit cleanly.
            var strategy = _db.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
            await using var tx = await _db.Database.BeginTransactionAsync();
            try
            {
                GiftCard? card = null;
                if (request.GiftCardId > 0)
                    card = await _giftCards.GetByIdWithUsersAsync(request.GiftCardId);
                else if (!string.IsNullOrWhiteSpace(request.Code))
                    card = await _giftCards.GetByShortCodeWithUsersAsync(NormalizeShortCode(request.Code));

                if (card == null)
                {
                    return new GiftCardResponse(
                        new GeneralResponse(false, "כרטיס המתנה לא נמצא.", HttpContext.Request.Path),
                        null);
                }

                var currentUserId = GetCurrentUserId();
                var currentUser = await _users.GetByIdAsync(currentUserId);

                if (card.SenderId == currentUserId)
                {
                    // Email-only gifts addressed to the sender's own inbox
                    // are self-gifts (common when demoing alone). Block only
                    // when the sender tries to claim a gift meant for someone else.
                    var senderEmail = currentUser?.Email?.Trim();
                    var addressedToSelf =
                        !card.RecipientId.HasValue
                        && !string.IsNullOrWhiteSpace(card.RecipientEmail)
                        && !string.IsNullOrWhiteSpace(senderEmail)
                        && string.Equals(
                            card.RecipientEmail.Trim(),
                            senderEmail,
                            StringComparison.OrdinalIgnoreCase);

                    if (!addressedToSelf)
                    {
                        return new GiftCardResponse(
                            new GeneralResponse(false, "לא ניתן לממש מתנה ששלחת בעצמך.", HttpContext.Request.Path),
                            null);
                    }
                }

                // Registered recipient: only that user may redeem. Email-only
                // gifts are claimed by whoever holds the share code.
                if (card.RecipientId.HasValue && card.RecipientId != currentUserId)
                {
                    return new GiftCardResponse(
                        new GeneralResponse(false, "אין לך הרשאה לממש את כרטיס המתנה הזה.", HttpContext.Request.Path),
                        null);
                }

                if (card.Status != GiftCardStatus.Active)
                {
                    var msg = card.Status switch
                    {
                        GiftCardStatus.Redeemed =>
                            "כרטיס המתנה כבר מומש. לא ניתן לממש אותו שוב.",
                        GiftCardStatus.Expired => "תוקף כרטיס המתנה פג.",
                        _ => $"סטטוס הכרטיס הוא {card.Status} ולא ניתן לממש אותו.",
                    };
                    return new GiftCardResponse(
                        new GeneralResponse(false, msg, HttpContext.Request.Path),
                        card);
                }

                // Row lock so two parallel redeems can't both pass the
                // Active check before either commits.
                await _db.Database.ExecuteSqlRawAsync(
                    "SELECT \"Id\" FROM \"GiftCards\" WHERE \"Id\" = {0} FOR UPDATE",
                    card.Id);

                // Belt-and-suspenders: a prior redeem may have credited
                // the ledger even if status drifted.
                var alreadyCredited = await _db.Transactions.AnyAsync(
                    t => t.RelatedGiftCardId == card.Id
                      && t.Type == TransactionType.Load
                      && !t.IsReversal);
                if (alreadyCredited)
                {
                    return new GiftCardResponse(
                        new GeneralResponse(false,
                            "כרטיס המתנה כבר מומש. לא ניתן לממש אותו שוב.",
                            HttpContext.Request.Path),
                        card);
                }

                if (card.ExpirationDate <= DateTime.UtcNow)
                {
                    card.Status = GiftCardStatus.Expired;
                    _db.GiftCards.Update(card);
                    await _db.SaveChangesAsync();
                    await tx.CommitAsync();

                    return new GiftCardResponse(
                        new GeneralResponse(false, "תוקף כרטיס המתנה פג.", HttpContext.Request.Path),
                        card);
                }

                card.Status = GiftCardStatus.Redeemed;
                if (!card.RecipientId.HasValue)
                    card.RecipientId = currentUserId;
                _db.GiftCards.Update(card);

                await _balance.PostAsync(new LedgerEntry
                {
                    UserId = currentUserId,
                    Type = TransactionType.Load,
                    Amount = card.Amount,
                    Currency = card.Currency,
                    RelatedGiftCardId = card.Id,
                    Reference = $"giftcard:{card.Id}",
                    Description = $"Redeemed gift card #{card.Id}",
                });

                await _db.SaveChangesAsync();
                await tx.CommitAsync();

                await _notify.CreateAsync(
                    currentUserId,
                    "giftcard.redeemed",
                    "כרטיס המתנה מומש",
                    $"{card.Amount:0.00} {card.Currency} זוכו לארנק שלך.",
                    null);
                if (card.SenderId != currentUserId)
                {
                    await _notify.CreateAsync(
                        card.SenderId,
                        "giftcard.redeemed_by_recipient",
                        "המתנה שלך מומשה",
                        $"כרטיס {card.ShortCode} מומש על ידי הנמען.",
                        null);
                }

                return new GiftCardResponse(
                    new GeneralResponse(
                        true,
                        "כרטיס המתנה מומש בהצלחה.",
                        HttpContext.Request.Path,
                        new { amount = card.Amount, currency = card.Currency }),
                    card);
            }
            catch (DbUpdateConcurrencyException)
            {
                // Another request already changed this card's status
                // (double-spend / concurrent redeem). Reject the second one.
                await tx.RollbackAsync();
                return new GiftCardResponse(
                    new GeneralResponse(false,
                        "כרטיס המתנה עודכן זה עתה בפעולה אחרת. רעננו ונסו שוב.",
                        HttpContext.Request.Path),
                    null);
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                return new GiftCardResponse(
                    new GeneralResponse(false, "שגיאת שרת פנימית: " + ex.Message, HttpContext.Request.Path),
                    null);
            }
            });
        }

        [HttpGet("Mine")]
        public async Task<MineGiftCardListResponse> Mine()
        {
            try
            {
                var items = await _giftCards.GetByUserAsync(GetCurrentUserId());
                var dtos = items.Select(g => new MineGiftCardDto(
                    g.Id,
                    g.ShortCode,
                    g.Amount,
                    g.Currency,
                    g.Status.ToString(),
                    g.ExpirationDate,
                    g.CreatedAt,
                    g.FlightSnapshot,
                    UserPublicDto.From(g.Sender),
                    UserPublicDto.From(g.Recipient),
                    g.RecipientEmail,
                    g.RecipientName
                )).ToArray();

                return new MineGiftCardListResponse(
                    new GeneralResponse(true, "OK", HttpContext.Request.Path),
                    dtos);
            }
            catch (Exception ex)
            {
                return new MineGiftCardListResponse(
                    new GeneralResponse(false, "שגיאת שרת פנימית: " + ex.Message, HttpContext.Request.Path),
                    Array.Empty<MineGiftCardDto>());
            }
        }

        /// <summary>
        /// Public lookup by ShortCode for the recipient page. The code
        /// itself is the bearer credential — anyone with the link can
        /// view the gift, so we deliberately omit user-PII fields from
        /// the response.
        /// </summary>
        [HttpGet("by-code/{code}")]
        [AllowAnonymous]
        public async Task<ActionResult<PublicGiftCardResponse>> GetByCode(string code, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(code))
                return NotFound(new PublicGiftCardResponse(
                    new GeneralResponse(false, "כרטיס המתנה לא נמצא.", HttpContext.Request.Path), null));

            var card = await _db.GiftCards
                .AsNoTracking()
                .Include(g => g.Sender)
                .FirstOrDefaultAsync(g => g.ShortCode == code, ct);

            if (card == null)
                return NotFound(new PublicGiftCardResponse(
                    new GeneralResponse(false, "כרטיס המתנה לא נמצא.", HttpContext.Request.Path), null));

            // If the card has expired but the status hasn't been swept
            // yet, surface "Expired" to the recipient instead of "Active".
            var status = (card.Status == GiftCardStatus.Active && card.ExpirationDate <= DateTime.UtcNow)
                ? GiftCardStatus.Expired
                : card.Status;

            var dto = new PublicGiftCardDto(
                card.Id,
                card.ShortCode,
                card.Amount,
                card.Currency,
                status.ToString(),
                card.ExpirationDate,
                card.CreatedAt,
                card.FlightSnapshot,
                UserPublicDto.From(card.Sender)?.DisplayName
            );

            return Ok(new PublicGiftCardResponse(
                new GeneralResponse(true, "OK", HttpContext.Request.Path), dto));
        }

        // Generate FG-XXXX-XXXX with retry on the (rare) unique-index
        // collision. 32^8 = ~10^12 keyspace, so collisions are very rare
        // on a healthy table; we still retry to be correct, not just lucky.
        private async Task<string> GenerateUniqueShortCodeAsync()
        {
            const string alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/1/I/O
            var rng = System.Security.Cryptography.RandomNumberGenerator.Create();
            var buf = new byte[8];
            for (var attempt = 0; attempt < 5; attempt++)
            {
                rng.GetBytes(buf);
                var chars = new char[8];
                for (var i = 0; i < 8; i++) chars[i] = alpha[buf[i] % alpha.Length];
                var code = $"FG-{new string(chars, 0, 4)}-{new string(chars, 4, 4)}";
                if (!await _db.GiftCards.AnyAsync(g => g.ShortCode == code))
                    return code;
            }
            throw new InvalidOperationException("Failed to generate unique gift card ShortCode after 5 attempts.");
        }

        private static string NormalizeShortCode(string code) =>
            code.Trim().ToUpperInvariant();

        [HttpGet("{id:int}")]
        public async Task<GiftCardResponse> GetById(int id)
        {
            try
            {
                var card = await _giftCards.GetByIdWithUsersAsync(id);
                if (card == null)
                {
                    return new GiftCardResponse(
                        new GeneralResponse(false, "כרטיס המתנה לא נמצא.", HttpContext.Request.Path),
                        null);
                }

                var currentUserId = GetCurrentUserId();
                if (card.SenderId != currentUserId && card.RecipientId != currentUserId)
                {
                    return new GiftCardResponse(
                        new GeneralResponse(false, "אין לך הרשאה לצפות בכרטיס המתנה הזה.", HttpContext.Request.Path),
                        null);
                }

                return new GiftCardResponse(
                    new GeneralResponse(true, "OK", HttpContext.Request.Path),
                    card);
            }
            catch (Exception ex)
            {
                return new GiftCardResponse(
                    new GeneralResponse(false, "שגיאת שרת פנימית: " + ex.Message, HttpContext.Request.Path),
                    null);
            }
        }
    }

    public class CreateGiftCardRequest
    {
        // Either RecipientId (registered user) OR RecipientEmail +
        // RecipientName (external party) is required. RecipientId == 0
        // is treated as missing, since 0 is the default for `int` and
        // most clients omit the field rather than send it explicitly.
        public int? RecipientId { get; set; }
        public string? RecipientEmail { get; set; }
        public string? RecipientName { get; set; }

        public decimal Amount { get; set; }
        public string Currency { get; set; } = "ILS";
        public DateTime ExpirationDate { get; set; }

        // Frozen flight intent (airline, destination, dates, message,
        // variant, etc.) serialized as JSON. Stored as-is on GiftCard.
        public string? FlightSnapshot { get; set; }
    }

    public class RedeemGiftCardRequest
    {
        /// <summary>Internal PK — used from the gift detail modal.</summary>
        public int GiftCardId { get; set; }

        /// <summary>Public share code (FG-XXXX-XXXX) — used from /redeem.</summary>
        public string? Code { get; set; }
    }

    // Sanitized projection returned by the public by-code endpoint. The
    // raw GiftCard entity carries Sender/Recipient User navigation props
    // (with PasswordHash etc.) — never serialize that to anonymous callers.
    public record PublicGiftCardDto(
        int Id,
        string ShortCode,
        decimal Amount,
        string Currency,
        string Status,
        DateTime ExpirationDate,
        DateTime CreatedAt,
        string? FlightSnapshot,
        string? SenderName
    );

    public class PublicGiftCardResponse : GeneralResponse
    {
        public PublicGiftCardDto? GiftCard { get; }
        public PublicGiftCardResponse(GeneralResponse parent, PublicGiftCardDto? card) : base(parent)
        {
            GiftCard = card;
        }
    }

    // Authenticated /Mine projection. Uses UserPublicDto for sender +
    // recipient so we never leak Email, PhoneNumber, AccountBalance, etc.
    // RecipientEmail / RecipientName are the snapshot stored on the card
    // itself (when sent to an external party by email — Slice 3).
    public record MineGiftCardDto(
        int Id,
        string ShortCode,
        decimal Amount,
        string Currency,
        string Status,
        DateTime ExpirationDate,
        DateTime CreatedAt,
        string? FlightSnapshot,
        UserPublicDto? Sender,
        UserPublicDto? Recipient,
        string? RecipientEmail,
        string? RecipientName
    );

    public class MineGiftCardListResponse : GeneralResponse
    {
        public IEnumerable<MineGiftCardDto> Items { get; }
        public MineGiftCardListResponse(GeneralResponse parent, IEnumerable<MineGiftCardDto> items)
            : base(parent)
        {
            Items = items;
        }
    }
}
