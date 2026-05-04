using FlyGiftBackend.Data;
using FlyGiftBackend.Models;
using FlyGiftBackend.Reposetories;
using Microsoft.EntityFrameworkCore;

namespace FlyGiftBackend.Repositories
{
    public class TransactionRepository : Repository<Transaction>
    {
        public TransactionRepository(AppDbContext context) : base(context) { }

        protected override DbSet<Transaction> GetTable(AppDbContext context)
        {
            return context.Transactions;
        }

        public List<Transaction> GetTransactionsByUserId(int userId)
        {
            return GetTable().Where(transaction => transaction.UserId == userId).ToList();
        }

        public Task<List<Transaction>> GetByUserAsync(int userId) =>
            GetTable()
                .Include(t => t.RelatedGiftCard)
                .Where(t => t.UserId == userId)
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();
    }
}
