using System.Security.Claims;
using FlyGiftBackend.Data;
using FlyGiftBackend.Models;
using FlyGiftBackend.Repositories;
using FlyGiftBackend.Responses.GiftCards;
using FlyGiftBackend.Services;
using FlyGiftBackend.Services.Ledger;
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

        public GiftCardController(
            GiftCardRepository giftCards,
            TransactionRepository transactions,
            AuthRepository users,
            AppDbContext db,
            IIdempotencyService idem,
            IBalanceService balance)
        {
            _giftCards = giftCards;
            _transactions = transactions;
            _users = users;
            _db = db;
            _idem = idem;
            _balance = balance;
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
                        new GeneralResponse(false, "Idempotency-Key too long.", HttpContext.Request.Path),
                        null);
                }
                if (_idem.TryGet<GiftCardResponse>("giftcard.purchase", senderId, idemKey, out var cached) && cached != null)
                {
                    Response.Headers["Idempotent-Replay"] = "true";
                    return cached;
                }
            }

            await using var tx = await _db.Database.BeginTransactionAsync();
            try
            {
                if (request.Amount <= 0)
                {
                    return new GiftCardResponse(
                        new GeneralResponse(false, "Amount must be greater than zero.", HttpContext.Request.Path),
                        null);
                }

                if (string.IsNullOrWhiteSpace(request.Currency))
                {
                    return new GiftCardResponse(
                        new GeneralResponse(false, "Currency is required.", HttpContext.Request.Path),
                        null);
                }

                if (request.ExpirationDate <= DateTime.UtcNow)
                {
                    return new GiftCardResponse(
                        new GeneralResponse(false, "Expiration date must be in the future.", HttpContext.Request.Path),
                        null);
                }

                if (request.RecipientId == senderId)
                {
                    return new GiftCardResponse(
                        new GeneralResponse(false, "You cannot send a gift card to yourself.", HttpContext.Request.Path),
                        null);
                }

                var recipient = _users.GetEntityById(request.RecipientId);
                if (recipient == null)
                {
                    return new GiftCardResponse(
                        new GeneralResponse(false, "Recipient not found.", HttpContext.Request.Path),
                        null);
                }

                var card = new GiftCard
                {
                    SenderId = senderId,
                    RecipientId = request.RecipientId,
                    Amount = request.Amount,
                    Currency = request.Currency,
                    ExpirationDate = request.ExpirationDate,
                    Status = GiftCardStatus.Active,
                    CreatedAt = DateTime.UtcNow
                };

                _db.GiftCards.Add(card);
                await _db.SaveChangesAsync();

                await _balance.PostAsync(new LedgerEntry
                {
                    UserId = senderId,
                    Type = TransactionType.Load,
                    Amount = request.Amount,
                    Currency = request.Currency,
                    RelatedGiftCardId = card.Id,
                    Reference = $"giftcard:{card.Id}",
                    Description = $"Issued gift card #{card.Id} to user {request.RecipientId}",
                });

                await tx.CommitAsync();

                var response = new GiftCardResponse(
                    new GeneralResponse(true, "Gift card purchased successfully.", HttpContext.Request.Path),
                    card);

                if (!string.IsNullOrWhiteSpace(idemKey))
                {
                    _idem.Save("giftcard.purchase", senderId, idemKey, response);
                }

                return response;
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                return new GiftCardResponse(
                    new GeneralResponse(false, "Internal Server Error: " + ex.Message, HttpContext.Request.Path),
                    null);
            }
        }

        [HttpPost("Redeem")]
        public async Task<GiftCardResponse> Redeem([FromBody] RedeemGiftCardRequest request)
        {
            await using var tx = await _db.Database.BeginTransactionAsync();
            try
            {
                var card = await _giftCards.GetByIdWithUsersAsync(request.GiftCardId);
                if (card == null)
                {
                    return new GiftCardResponse(
                        new GeneralResponse(false, "Gift card not found.", HttpContext.Request.Path),
                        null);
                }

                var currentUserId = GetCurrentUserId();
                if (card.RecipientId != currentUserId)
                {
                    return new GiftCardResponse(
                        new GeneralResponse(false, "You are not authorized to redeem this gift card.", HttpContext.Request.Path),
                        null);
                }

                if (card.Status != GiftCardStatus.Active)
                {
                    return new GiftCardResponse(
                        new GeneralResponse(false, $"Gift card is {card.Status} and cannot be redeemed.", HttpContext.Request.Path),
                        card);
                }

                if (card.ExpirationDate <= DateTime.UtcNow)
                {
                    card.Status = GiftCardStatus.Expired;
                    _db.GiftCards.Update(card);
                    await _db.SaveChangesAsync();
                    await tx.CommitAsync();

                    return new GiftCardResponse(
                        new GeneralResponse(false, "Gift card has expired.", HttpContext.Request.Path),
                        card);
                }

                card.Status = GiftCardStatus.Redeemed;
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

                return new GiftCardResponse(
                    new GeneralResponse(true, "Gift card redeemed successfully.", HttpContext.Request.Path),
                    card);
            }
            catch (DbUpdateConcurrencyException)
            {
                // Another request already changed this card's status
                // (double-spend / concurrent redeem). Reject the second one.
                await tx.RollbackAsync();
                return new GiftCardResponse(
                    new GeneralResponse(false,
                        "This gift card was just updated by another action. Please refresh and try again.",
                        HttpContext.Request.Path),
                    null);
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                return new GiftCardResponse(
                    new GeneralResponse(false, "Internal Server Error: " + ex.Message, HttpContext.Request.Path),
                    null);
            }
        }

        [HttpGet("Mine")]
        public async Task<GiftCardListResponse> Mine()
        {
            try
            {
                var items = await _giftCards.GetByUserAsync(GetCurrentUserId());
                return new GiftCardListResponse(
                    new GeneralResponse(true, "OK", HttpContext.Request.Path),
                    items);
            }
            catch (Exception ex)
            {
                return new GiftCardListResponse(
                    new GeneralResponse(false, "Internal Server Error: " + ex.Message, HttpContext.Request.Path),
                    Array.Empty<GiftCard>());
            }
        }

        [HttpGet("{id:int}")]
        public async Task<GiftCardResponse> GetById(int id)
        {
            try
            {
                var card = await _giftCards.GetByIdWithUsersAsync(id);
                if (card == null)
                {
                    return new GiftCardResponse(
                        new GeneralResponse(false, "Gift card not found.", HttpContext.Request.Path),
                        null);
                }

                var currentUserId = GetCurrentUserId();
                if (card.SenderId != currentUserId && card.RecipientId != currentUserId)
                {
                    return new GiftCardResponse(
                        new GeneralResponse(false, "You are not authorized to view this gift card.", HttpContext.Request.Path),
                        null);
                }

                return new GiftCardResponse(
                    new GeneralResponse(true, "OK", HttpContext.Request.Path),
                    card);
            }
            catch (Exception ex)
            {
                return new GiftCardResponse(
                    new GeneralResponse(false, "Internal Server Error: " + ex.Message, HttpContext.Request.Path),
                    null);
            }
        }
    }

    public class CreateGiftCardRequest
    {
        public int RecipientId { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "USD";
        public DateTime ExpirationDate { get; set; }
    }

    public class RedeemGiftCardRequest
    {
        public int GiftCardId { get; set; }
    }
}
