using FlyGiftBackend.Data;
using FlyGiftBackend.Models;
using FlyGiftBackend.Reposetories;
using Microsoft.EntityFrameworkCore;

namespace FlyGiftBackend.Repositories
{
    public class FlightBookingRepository : Repository<FlightBooking>
    {
        public FlightBookingRepository(AppDbContext context) : base(context) { }

        protected override DbSet<FlightBooking> GetTable(AppDbContext context)
        {
            return context.FlightBookings;
        }

        public List<FlightBooking> GetFlightBookingsByUserId(int userId)
        {
            return GetTable().Where(booking => booking.UserId == userId).ToList();
        }
    }
}
