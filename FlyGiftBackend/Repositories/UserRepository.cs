using FlyGiftBackend.Data;
using FlyGiftBackend.Models;
using FlyGiftBackend.Reposetories;
using Microsoft.EntityFrameworkCore;

namespace FlyGiftBackend.Repositories
{
    public class UserRepository : Repository<User>
    {
        public UserRepository(AppDbContext context) : base(context) { }

        protected override DbSet<User> GetTable(AppDbContext context)
        {
            return context.Users;
        }

    }
}
