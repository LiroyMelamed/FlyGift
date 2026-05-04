using System.Text.Json;
using FlyGiftBackend.Data;
using FlyGiftBackend.Models;
using FlyGiftBackend.Services.Flights;
using FlyGiftBackend.Services.Ledger;
using FlyGiftBackend.Services.Payments;
using FlyGiftBackend.Services.Wallet;
using Microsoft.EntityFrameworkCore;

namespace FlyGiftBackend.Services.Booking
{
    /// <summary>
    /// Atomic flight-booking pipeline:
    ///   1. Re-resolve the offer (token round-trip) and validate freshness.
    ///   2. Compute split: pull as much as possible from User.AccountBalance,
    ///      charge the card for the remainder via IPaymentProvider.
    ///   3. Persist Spend transaction(s), the FlightBooking row with
    ///      BoardingPassData (consumed by WalletService), and decrement balance.
    /// All writes happen inside a single DB transaction; if the card charge
    /// fails *after* the balance was tentatively reserved, the whole thing
    /// rolls back.
    /// </summary>
    public class BookingService : IBookingService
    {
        private readonly AppDbContext _db;
        private readonly IFlightSearchProvider _flights; // mock provider; in prod inject the active one
        private readonly IPaymentProvider _payments;
        private readonly IBalanceService _balance;
        private readonly ILogger<BookingService> _log;

        public BookingService(
            AppDbContext db,
            IFlightSearchProvider flights,
            IPaymentProvider payments,
            IBalanceService balance,
            ILogger<BookingService> log)
        {
            _db = db;
            _flights = flights;
            _payments = payments;
            _balance = balance;
            _log = log;
        }

        public async Task<BookFlightResult> BookFlightAsync(
            int userId, BookFlightRequest request, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(request.OfferId))
                throw new InvalidOperationException("OfferId is required.");
            if (string.IsNullOrWhiteSpace(request.PassengerName))
                throw new InvalidOperationException("Passenger name is required.");

            var offer = await _flights.GetOfferAsync(request.OfferId, ct)
                ?? throw new InvalidOperationException("Offer not found or expired.");

            if (offer.ExpiresAt < DateTime.UtcNow)
                throw new InvalidOperationException("Offer has expired. Please re-search.");

            var user = await _db.Users.FindAsync(new object?[] { userId }, ct)
                ?? throw new InvalidOperationException("User not found.");

            // Source of truth: ledger sum, not the cached column. This
            // closes the door on tampering attacks (Stage 16).
            var ledgerBalance = await _balance.GetBalanceAsync(userId, ct);
            var total = offer.Price.Total;
            var fromBalance = Math.Min(ledgerBalance, total);
            var fromCard = total - fromBalance;

            if (fromCard > 0 && string.IsNullOrWhiteSpace(request.PaymentMethodToken))
                throw new InvalidOperationException(
                    $"Insufficient balance. Add a payment method to cover the remaining {fromCard:0.00} {offer.Price.Currency}.");

            await using var tx = await _db.Database.BeginTransactionAsync(ct);
            try
            {
                PaymentResult? charge = null;
                if (fromCard > 0)
                {
                    charge = await _payments.ChargeAsync(new PaymentChargeRequest
                    {
                        UserId = userId,
                        Amount = fromCard,
                        Currency = offer.Price.Currency,
                        PaymentMethodToken = request.PaymentMethodToken!,
                        Description = $"FlyGift booking {offer.Carrier.Iata}{offer.Slices[0].Segments[0].FlightNumber}",
                    }, ct);

                    if (!charge.Success)
                        throw new InvalidOperationException(charge.FailureReason ?? "Card declined.");
                }

                // Concurrency: optimistic on Postgres `xmin` (see AppDbContext).
                // Mutating AccountBalance triggers an UPDATE that includes
                // `WHERE xmin = @original`, so a racing booking will throw
                // DbUpdateConcurrencyException and we retry/refuse cleanly.
                user.AccountBalance -= fromBalance;

                var firstSegment = offer.Slices[0].Segments[0];
                var slice = offer.Slices[0];
                var seat = AssignSeat(offer);
                var gate = AssignGate(offer);
                var bref = "FG" + Guid.NewGuid().ToString("N")[..6].ToUpper();

                var boardingPass = new BoardingPassData
                {
                    PassengerName = request.PassengerName,
                    FlightNumber = firstSegment.FlightNumber,
                    Carrier = offer.Carrier.Name,
                    Origin = slice.Origin.Iata,
                    OriginCity = slice.Origin.City,
                    Destination = slice.Destination.Iata,
                    DestinationCity = slice.Destination.City,
                    DepartureUtc = slice.DepartureUtc,
                    ArrivalUtc = slice.ArrivalUtc,
                    Gate = gate,
                    Seat = seat,
                    Terminal = slice.Origin.Terminal ?? "—",
                    Cabin = "Economy",
                    BookingReference = bref,
                    BarcodePayload = $"FG|{bref}|{firstSegment.FlightNumber}|{slice.DepartureUtc:O}",
                };

                var flightDetails = new
                {
                    offer.Carrier,
                    offer.Stops,
                    offer.TotalDurationMinutes,
                    offer.Price,
                    offer.Slices,
                };

                var booking = new FlightBooking
                {
                    UserId = userId,
                    Status = BookingStatus.Booked,
                    CreatedAt = DateTime.UtcNow,
                    FlightDetails = JsonSerializer.Serialize(flightDetails),
                    BoardingPassData = JsonSerializer.Serialize(boardingPass),
                };
                _db.FlightBookings.Add(booking);
                await _db.SaveChangesAsync(ct);

                var bookingRef = $"booking:{booking.Id}";
                if (fromBalance > 0)
                {
                    await _balance.PostAsync(new LedgerEntry
                    {
                        UserId = userId,
                        Type = TransactionType.Spend,
                        Amount = fromBalance,
                        Currency = offer.Price.Currency,
                        Reference = bookingRef,
                        Description = $"Flight {firstSegment.FlightNumber} ({slice.Origin.Iata}→{slice.Destination.Iata}) — wallet",
                    }, ct);
                }
                if (fromCard > 0)
                {
                    await _balance.PostAsync(new LedgerEntry
                    {
                        UserId = userId,
                        Type = TransactionType.Spend,
                        Amount = fromCard,
                        Currency = offer.Price.Currency,
                        Reference = bookingRef,
                        Description = $"Flight {firstSegment.FlightNumber} ({slice.Origin.Iata}→{slice.Destination.Iata}) — card {charge?.Brand} •••{charge?.Last4}",
                    }, ct);
                }
                await tx.CommitAsync(ct);

                return new BookFlightResult
                {
                    BookingId = booking.Id,
                    FlightNumber = firstSegment.FlightNumber,
                    Route = $"{slice.Origin.Iata} → {slice.Destination.Iata}",
                    DepartureUtc = slice.DepartureUtc,
                    Seat = seat,
                    Gate = gate,
                    TotalCharged = total,
                    PaidFromBalance = fromBalance,
                    PaidFromCard = fromCard,
                    Currency = offer.Price.Currency,
                    RemainingBalance = user.AccountBalance,
                    CardBrand = charge?.Brand,
                    CardLast4 = charge?.Last4,
                };
            }
            catch (DbUpdateConcurrencyException)
            {
                await tx.RollbackAsync(ct);
                _log.LogWarning("Concurrency conflict booking offer {OfferId} for user {UserId}", offer.Id, userId);
                throw new InvalidOperationException(
                    "Your wallet was updated in another window. Please try again.");
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        }

        private static string AssignSeat(FlightOffer offer)
        {
            var rng = new Random(offer.Id.GetHashCode());
            return $"{rng.Next(1, 38)}{(char)('A' + rng.Next(0, 6))}";
        }

        private static string AssignGate(FlightOffer offer)
        {
            var rng = new Random(offer.Id.GetHashCode() ^ 0x5A5A);
            return $"{(char)('A' + rng.Next(0, 6))}{rng.Next(1, 30)}";
        }
    }
}
