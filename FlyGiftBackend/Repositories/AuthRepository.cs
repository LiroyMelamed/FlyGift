using FlyGiftBackend.Data;
using FlyGiftBackend.Models;
using FlyGiftBackend.Reposetories;
using Microsoft.EntityFrameworkCore;

namespace FlyGiftBackend.Repositories
{
    public class AuthRepository : Repository<User>
    {
        public AuthRepository(AppDbContext context) : base(context) { }

        protected override DbSet<User> GetTable(AppDbContext context)
        {
            return context.Users;
        }

        public User GetUserByUsername(string username)
        {
            return GetTable().FirstOrDefault(u => u.UserName == username);
        }
    }
}
