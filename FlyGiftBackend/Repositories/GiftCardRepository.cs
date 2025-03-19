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

        // Add any GiftCard-specific methods here
        public List<GiftCard> GetGiftCardsBySenderId(int senderId)
        {
            return GetTable().Where(giftCard => giftCard.SenderId == senderId).ToList();
        }
    }
}
