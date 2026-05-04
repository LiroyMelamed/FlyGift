using System.Security.Claims;
using FlyGiftBackend.Models;
using FlyGiftBackend.Repositories;
using FlyGiftBackend.Responses.Transactions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FlyGiftBackend.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/[controller]")]
    public class TransactionController : ControllerBase
    {
        private readonly TransactionRepository _transactions;

        public TransactionController(TransactionRepository transactions)
        {
            _transactions = transactions;
        }

        private int GetCurrentUserId()
        {
            var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.Parse(idClaim!);
        }

        [HttpGet("Mine")]
        public async Task<TransactionListResponse> Mine()
        {
            try
            {
                var items = await _transactions.GetByUserAsync(GetCurrentUserId());
                return new TransactionListResponse(
                    new GeneralResponse(true, "OK", HttpContext.Request.Path),
                    items);
            }
            catch (Exception ex)
            {
                return new TransactionListResponse(
                    new GeneralResponse(false, "Internal Server Error: " + ex.Message, HttpContext.Request.Path),
                    Array.Empty<Transaction>());
            }
        }
    }
}
