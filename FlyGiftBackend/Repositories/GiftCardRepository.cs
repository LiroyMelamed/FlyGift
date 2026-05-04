using FlyGiftBackend.Data;
using FlyGiftBackend.Models;
using FlyGiftBackend.Reposetories;
using Microsoft.EntityFrameworkCore;

namespace FlyGiftBackend.Repositories
{
    public class GiftCardRepository : Repository<GiftCard>
    {
        public GiftCardRepository(AppDbContext context) : base(context) { }

        protected override DbSet<GiftCard> GetTable(AppDbContext context)
        {
            return context.GiftCards;
        }

        public List<GiftCard> GetGiftCardsBySenderId(int senderId)
        {
            return GetTable().Where(giftCard => giftCard.SenderId == senderId).ToList();
        }

        public Task<GiftCard?> GetByIdWithUsersAsync(int id) =>
            GetTable()
                .Include(g => g.Sender)
                .Include(g => g.Recipient)
                .FirstOrDefaultAsync(g => g.Id == id);

        public Task<List<GiftCard>> GetByUserAsync(int userId) =>
            GetTable()
                .Where(g => g.SenderId == userId || g.RecipientId == userId)
                .OrderByDescending(g => g.CreatedAt)
                .ToListAsync();
    }
}
