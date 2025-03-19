using FlyGiftBackend.Models;
using Microsoft.EntityFrameworkCore;

namespace FlyGiftBackend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
        public DbSet<User> Users { get; set; }
        public DbSet<Transaction> Transactions { get; set; }
        public DbSet<GiftCard> GiftCards { get; set; } 
        public DbSet<HotelBooking> HotelBookings { get; set; }
        public DbSet<FlightBooking> FlightBookings { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<GiftCard>().Property(p => p.Amount).HasColumnType("decimal(18, 2)");
            modelBuilder.Entity<Transaction>().Property(p => p.Amount).HasColumnType("decimal(18, 2)");
        }

    }
}
