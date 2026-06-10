using System.Text.Json;
using FlyGiftBackend.Data;
using FlyGiftBackend.Models;
using FlyGiftBackend.Services.Flights;
using FlyGiftBackend.Services.Ledger;
using FlyGiftBackend.Services.Notifications;
using FlyGiftBackend.Services.Wallet;
using Microsoft.EntityFrameworkCore;

namespace FlyGiftBackend.Services.Booking
{
    /// <summary>
    /// Tagged exception thrown when the user's wallet alone can't cover
    /// the offer. The controller surfaces a structured error code so the
    /// frontend can route the user to the wallet top-up flow rather than
    /// dead-ending on a toast.
    /// </summary>
    public sealed class InsufficientBalanceException : InvalidOperationException
    {
        public decimal MissingAmount { get; }
        public string Currency { get; }
        public InsufficientBalanceException(decimal missingAmount, string currency)
            : base($"יתרה לא מספקת. חסר {missingAmount:0.00} {currency}. נא לטעון את הארנק.")
        {
            MissingAmount = missingAmount;
            Currency = currency;
        }
    }

    /// <summary>
    /// Atomic flight-booking pipeline (Tequila Deposit model):
    ///   1. Re-resolve the offer & validate freshness (search-time cache).
    ///   2. Verify the user's wallet covers the full price (deposit model
    ///      requires no card charge — Kiwi pulls from the partner balance).
    ///   3. Call <see cref="IFlightBookingProvider"/>: check_flights →
    ///      save_booking → confirm_payment. The provider raises
    ///      <see cref="PriceChangedException"/> if the upstream re-priced
    ///      the itinerary; the controller bubbles that to the UI.
    ///   4. Persist Spend ledger entry + FlightBooking row with the real
    ///      Kiwi booking id / PNR. Status is <see cref="BookingStatus.Confirmed"/>
    ///      live, <see cref="BookingStatus.TestConfirmed"/> on sandbox.
    /// All writes happen inside a single DB transaction; the wallet debit
    /// happens AFTER confirm_payment succeeds, so a Kiwi failure leaves
    /// the user's funds untouched.
    /// </summary>
    public class BookingService : IBookingService
    {
        private readonly AppDbContext _db;
        private readonly IFlightSearchProvider _flights;
        private readonly IFlightBookingProvider _orders;
        private readonly IBalanceService _balance;
        private readonly INotificationStore _notify;
        private readonly ILogger<BookingService> _log;

        public BookingService(
            AppDbContext db,
            IFlightSearchProvider flights,
            IFlightBookingProvider orders,
            IBalanceService balance,
            INotificationStore notify,
            ILogger<BookingService> log)
        {
            _db = db;
            _flights = flights;
            _orders = orders;
            _balance = balance;
            _notify = notify;
            _log = log;
        }

        public async Task<BookFlightResult> BookFlightAsync(
            int userId, BookFlightRequest request, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(request.OfferId))
                throw new InvalidOperationException("מזהה ההצעה חסר.");

            var passengers = (request.Passengers ?? new List<PassengerInfo>())
                .Where(p => p != null && !string.IsNullOrWhiteSpace(p.FullName))
                .ToList();
            if (passengers.Count == 0 && !string.IsNullOrWhiteSpace(request.PassengerName))
            {
                var parts = request.PassengerName.Trim().Split(' ', 2);
                passengers.Add(new PassengerInfo
                {
                    FirstName = parts[0],
                    LastName = parts.Length > 1 ? parts[1] : "",
                });
            }
            if (passengers.Count == 0)
                throw new InvalidOperationException("חסר מנשר נוסעים.");
            if (passengers.Any(p => string.IsNullOrWhiteSpace(p.FirstName)))
                throw new InvalidOperationException("חסר שם פרטי לאחד הנוסעים.");

            var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct);
            var contactEmail = request.ContactEmail ?? user?.Email;
            var contactPhone = request.ContactPhone ?? user?.PhoneNumber;
            if (string.IsNullOrWhiteSpace(contactEmail))
                throw new InvalidOperationException("חסר כתובת דוא\"ל בפרופיל. עדכנו את הפרופיל ונסו שוב.");

            var offer = await _flights.GetOfferAsync(request.OfferId, ct)
                ?? throw new InvalidOperationException("ההצעה לא נמצאה או שפג תוקפה. נסו לחפש שוב.");

            if (offer.ExpiresAt < DateTime.UtcNow)
                throw new InvalidOperationException("תוקף ההצעה פג. נסו לחפש שוב.");

            // Source of truth: ledger sum. Closes the door on tampering
            // attacks (Stage 16). Deposit model requires the wallet to
            // cover the full price — there's no card-fallback path.
            var ledgerBalance = await _balance.GetBalanceAsync(userId, ct);
            var quotedPrice = offer.Price.Total;
            var agreedPrice = request.AcceptedPrice ?? quotedPrice;

            if (ledgerBalance < agreedPrice)
                throw new InsufficientBalanceException(agreedPrice - ledgerBalance, offer.Price.Currency);

            // Talk to Kiwi BEFORE we touch the ledger, so a failure or
            // PriceChangedException leaves the wallet in its original
            // state — no compensating refund needed.
            var orderResult = await _orders.BookAsync(new BookOrderRequest
            {
                Offer = offer,
                Passengers = passengers,
                ContactEmail = contactEmail,
                ContactPhone = contactPhone,
                AgreedPrice = agreedPrice,
            }, ct);

            // Kiwi's confirm_payment returned 0 — debit the wallet for the
            // FINAL price the upstream actually settled (post-check_flights).
            // Keeps Neon's ledger reconciled with Kiwi's records.
            var finalPrice = orderResult.FinalPrice;

            var strategy = _db.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                await using var tx = await _db.Database.BeginTransactionAsync(ct);
                try
                {
                    var firstSegment = offer.Slices[0].Segments[0];
                    var slice = offer.Slices[0];
                    var gate = AssignGate(offer);
                    var bref = orderResult.Pnr ?? ("FG" + Guid.NewGuid().ToString("N")[..6].ToUpper());

                    // Boarding pass data is preliminary — Tequila returns a
                    // PNR, not seat/gate (those come from the airline). We
                    // keep the deterministic placeholders so the wallet
                    // pkpass + trips timeline keep rendering; check-in/seat
                    // selection happens with the airline directly.
                    var boardingPasses = passengers.Select((p, i) => new BoardingPassData
                    {
                        PassengerName = p.FullName,
                        FlightNumber = firstSegment.FlightNumber,
                        Carrier = offer.Carrier.Name,
                        Origin = slice.Origin.Iata,
                        OriginCity = slice.Origin.City,
                        Destination = slice.Destination.Iata,
                        DestinationCity = slice.Destination.City,
                        DepartureUtc = slice.DepartureUtc,
                        ArrivalUtc = slice.ArrivalUtc,
                        Gate = gate,
                        Seat = AssignSeat(offer, i),
                        Terminal = slice.Origin.Terminal ?? "—",
                        Cabin = "Economy",
                        BookingReference = bref,
                        BarcodePayload = $"FG|{bref}|{firstSegment.FlightNumber}|{slice.DepartureUtc:O}|{i}",
                    }).ToList();
                    var boardingPass = boardingPasses[0];

                    var flightDetails = new
                    {
                        offer.Carrier,
                        offer.Stops,
                        offer.TotalDurationMinutes,
                        offer.Price,
                        offer.Slices,
                    };

                    // Confirmed only after a successful confirm_payment;
                    // sandbox bookings land as TestConfirmed so reconciliation
                    // jobs and the UI never settle them against real funds.
                    var bookingStatus = orderResult.IsTest
                        ? BookingStatus.TestConfirmed
                        : BookingStatus.Confirmed;

                    var booking = new FlightBooking
                    {
                        UserId = userId,
                        Status = bookingStatus,
                        CreatedAt = DateTime.UtcNow,
                        FlightDetails = JsonSerializer.Serialize(flightDetails),
                        BoardingPassData = JsonSerializer.Serialize(boardingPasses),
                        KiwiBookingId = orderResult.ProviderBookingId,
                        KiwiPnr = orderResult.Pnr,
                    };
                    _db.FlightBookings.Add(booking);
                    await _db.SaveChangesAsync(ct);

                    // Wallet debit — Spend ledger entry references both our
                    // booking row and Kiwi's id so reconciliation can join
                    // either way.
                    var bookingRef = $"booking:{booking.Id}";
                    await _balance.PostAsync(new LedgerEntry
                    {
                        UserId = userId,
                        Type = TransactionType.Spend,
                        Amount = finalPrice,
                        Currency = orderResult.Currency,
                        Reference = bookingRef,
                        Description =
                            $"Flight {firstSegment.FlightNumber} ({slice.Origin.Iata}→{slice.Destination.Iata}) · Kiwi#{orderResult.ProviderBookingId}",
                    }, ct);

                    await tx.CommitAsync(ct);

                    var remainingBalance = await _balance.GetBalanceAsync(userId, ct);

                    await _notify.CreateAsync(
                        userId,
                        "booking.flight",
                        orderResult.IsTest ? "טיסת בדיקה אושרה (Sandbox)" : "הטיסה אושרה",
                        $"{firstSegment.FlightNumber} · {slice.Origin.Iata} → {slice.Destination.Iata} · {slice.DepartureUtc:dd/MM/yyyy HH:mm}",
                        "/bookings/mine",
                        ct);

                    return new BookFlightResult
                    {
                        BookingId = booking.Id,
                        FlightNumber = firstSegment.FlightNumber,
                        Route = $"{slice.Origin.Iata} → {slice.Destination.Iata}",
                        DepartureUtc = slice.DepartureUtc,
                        Seat = boardingPass.Seat,
                        Gate = gate,
                        TotalCharged = finalPrice,
                        PaidFromBalance = finalPrice,
                        Currency = orderResult.Currency,
                        RemainingBalance = remainingBalance,
                        KiwiBookingId = orderResult.ProviderBookingId,
                        KiwiPnr = orderResult.Pnr,
                        IsTestBooking = orderResult.IsTest,
                    };
                }
                catch (DbUpdateConcurrencyException)
                {
                    await tx.RollbackAsync(ct);
                    _log.LogWarning("Concurrency conflict booking offer {OfferId} for user {UserId}", offer.Id, userId);
                    throw new InvalidOperationException("הארנק עודכן בחלון אחר. נסו שוב.");
                }
                catch
                {
                    await tx.RollbackAsync(ct);
                    throw;
                }
            });
        }

        private static string AssignSeat(FlightOffer offer, int passengerIndex = 0)
        {
            var rng = new Random(HashCode.Combine(offer.Id, passengerIndex));
            return $"{rng.Next(1, 38)}{(char)('A' + rng.Next(0, 6))}";
        }

        private static string AssignGate(FlightOffer offer)
        {
            var rng = new Random(offer.Id.GetHashCode() ^ 0x5A5A);
            return $"{(char)('A' + rng.Next(0, 6))}{rng.Next(1, 30)}";
        }
    }
}
