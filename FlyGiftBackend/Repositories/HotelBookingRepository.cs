using FlyGiftBackend.Data;
using FlyGiftBackend.Models;
using FlyGiftBackend.Reposetories;
using Microsoft.EntityFrameworkCore;

namespace FlyGiftBackend.Repositories
{
    public class HotelBookingRepository : Repository<HotelBooking>
    {
        public HotelBookingRepository(AppDbContext context) : base(context) { }

        protected override DbSet<HotelBooking> GetTable(AppDbContext context)
        {
            return context.HotelBookings;
        }

        // Example: Retrieve all hotel bookings for a specific user
        public List<HotelBooking> GetHotelBookingsByUserId(int userId)
        {
            return GetTable().Where(booking => booking.UserId == userId).ToList();
        }

        // Example: Retrieve bookings within a specific date range
        public List<HotelBooking> GetHotelBookingsByDateRange(DateTime startDate, DateTime endDate)
        {
            return GetTable().Where(booking => booking.CreatedAt >= startDate && booking.CreatedAt <= endDate).ToList();
        }
    }
}
