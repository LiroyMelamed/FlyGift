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
        public DbSet<BulkOrder> BulkOrders { get; set; }
        public DbSet<Notification> Notifications { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Postgres uses NUMERIC — EF Core's HasPrecision is provider-agnostic
            // and maps cleanly on both Npgsql and SQL Server.
            modelBuilder.Entity<GiftCard>().Property(p => p.Amount).HasPrecision(18, 2);
            modelBuilder.Entity<Transaction>().Property(p => p.Amount).HasPrecision(18, 2);
            modelBuilder.Entity<Transaction>().Property(p => p.BalanceAfter).HasPrecision(18, 2);
            modelBuilder.Entity<User>().Property(u => u.AccountBalance).HasPrecision(18, 2);
            modelBuilder.Entity<BulkOrder>().Property(b => b.TotalCharged).HasPrecision(18, 2);

            modelBuilder.Entity<GiftCard>()
                .HasOne(g => g.Sender)
                .WithMany()
                .HasForeignKey(g => g.SenderId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<GiftCard>()
                .HasOne(g => g.Recipient)
                .WithMany()
                .HasForeignKey(g => g.RecipientId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<GiftCard>()
                .HasIndex(g => g.RecipientId);

            modelBuilder.Entity<GiftCard>()
                .HasIndex(g => g.SenderId);

            // ShortCode is the recipient's lookup key on /gifts/{code} —
            // unique so the by-code endpoint never has to disambiguate.
            modelBuilder.Entity<GiftCard>()
                .HasIndex(g => g.ShortCode)
                .IsUnique();

            modelBuilder.Entity<Transaction>()
                .HasOne(t => t.User)
                .WithMany()
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Transaction>()
                .HasOne(t => t.RelatedGiftCard)
                .WithMany()
                .HasForeignKey(t => t.RelatedGiftCardId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<Transaction>()
                .HasIndex(t => new { t.UserId, t.CreatedAt });

            modelBuilder.Entity<Transaction>()
                .HasIndex(t => t.TransactionReference);

            // One Load credit per gift card — prevents double redemption
            // even under concurrent requests.
            modelBuilder.Entity<Transaction>()
                .HasIndex(t => t.RelatedGiftCardId)
                .IsUnique()
                .HasFilter("\"RelatedGiftCardId\" IS NOT NULL AND \"Type\" = 0 AND \"IsReversal\" = false")
                .HasDatabaseName("IX_Transactions_GiftCardLoad_Unique");

            // Optimistic concurrency tokens (Stage 16). Postgres exposes the
            // built-in `xmin` system column — mapped here as a shadow property
            // that EF Core treats as a row-version concurrency token.
            modelBuilder.Entity<User>()
                .HasIndex(u => u.UserName)
                .IsUnique();

            modelBuilder.Entity<User>()
                .Property<uint>("xmin")
                .HasColumnName("xmin")
                .HasColumnType("xid")
                .ValueGeneratedOnAddOrUpdate()
                .IsConcurrencyToken();

            modelBuilder.Entity<GiftCard>()
                .Property<uint>("xmin")
                .HasColumnName("xmin")
                .HasColumnType("xid")
                .ValueGeneratedOnAddOrUpdate()
                .IsConcurrencyToken();

            modelBuilder.Entity<BulkOrder>(b =>
            {
                b.HasIndex(x => x.BatchId).IsUnique();
                b.HasIndex(x => x.CompanyUserId);
                b.HasOne(x => x.Company)
                 .WithMany()
                 .HasForeignKey(x => x.CompanyUserId)
                 .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<FlightBooking>()
                .HasOne(f => f.User)
                .WithMany()
                .HasForeignKey(f => f.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<HotelBooking>()
                .HasOne(h => h.User)
                .WithMany()
                .HasForeignKey(h => h.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Notification>(n =>
            {
                n.HasOne(x => x.User)
                 .WithMany()
                 .HasForeignKey(x => x.UserId)
                 .OnDelete(DeleteBehavior.Cascade);
                // Hot path: most-recent unread for the bell icon.
                n.HasIndex(x => new { x.UserId, x.CreatedAt });
                n.HasIndex(x => new { x.UserId, x.ReadAt });
            });
        }

    }
}
