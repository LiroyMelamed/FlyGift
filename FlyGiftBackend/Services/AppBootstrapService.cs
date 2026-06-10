using FlyGiftBackend.Controllers;
using FlyGiftBackend.Models;
using FlyGiftBackend.Repositories;
using FlyGiftBackend.Services.Booking;
using Microsoft.EntityFrameworkCore;

namespace FlyGiftBackend.Services
{
    public sealed class BootstrapPayload
    {
        public UserProfileDto Profile { get; set; } = null!;
        public IEnumerable<Transaction> Transactions { get; set; } = Array.Empty<Transaction>();
        public IEnumerable<MineGiftCardDto> GiftCards { get; set; } = Array.Empty<MineGiftCardDto>();
        public IEnumerable<MineFlightBookingDto> Bookings { get; set; } = Array.Empty<MineFlightBookingDto>();
    }

    public interface IAppBootstrapService
    {
        Task<BootstrapPayload> LoadAsync(int userId, CancellationToken ct = default);
    }

    /// <summary>
    /// One round-trip payload for app boot — profile, ledger, gifts, bookings
    /// fetched in parallel instead of 4+ separate HTTP calls.
    /// </summary>
    public sealed class AppBootstrapService : IAppBootstrapService
    {
        private readonly UserRepository _users;
        private readonly TransactionRepository _transactions;
        private readonly GiftCardRepository _giftCards;
        private readonly FlightBookingRepository _bookings;

        public AppBootstrapService(
            UserRepository users,
            TransactionRepository transactions,
            GiftCardRepository giftCards,
            FlightBookingRepository bookings)
        {
            _users = users;
            _transactions = transactions;
            _giftCards = giftCards;
            _bookings = bookings;
        }

        public async Task<BootstrapPayload> LoadAsync(int userId, CancellationToken ct = default)
        {
            var userTask = _users.GetByIdAsync(userId, ct);
            var txTask = _transactions.GetRecentByUserAsync(userId, 100, ct);
            var giftsTask = _giftCards.GetByUserAsync(userId);
            var bookingsTask = _bookings.GetByUserAsync(userId);

            await Task.WhenAll(userTask, txTask, giftsTask, bookingsTask);

            var user = await userTask
                ?? throw new InvalidOperationException("User not found.");

            var now = DateTime.UtcNow;
            var giftRows = await giftsTask;
            var bookingRows = await bookingsTask;

            return new BootstrapPayload
            {
                Profile = UserProfileDto.From(user),
                Transactions = await txTask,
                GiftCards = giftRows.Select(g => new MineGiftCardDto(
                    g.Id,
                    g.ShortCode,
                    g.Amount,
                    g.Currency,
                    g.Status.ToString(),
                    g.ExpirationDate,
                    g.CreatedAt,
                    g.FlightSnapshot,
                    UserPublicDto.From(g.Sender),
                    UserPublicDto.From(g.Recipient),
                    g.RecipientEmail,
                    g.RecipientName
                )).ToArray(),
                Bookings = bookingRows.Select(b => FlightBookingMineMapper.Map(b, now)).ToArray(),
            };
        }
    }
}
