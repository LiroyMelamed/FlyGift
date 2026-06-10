using System.Globalization;
using System.Text.Json;
using System.Text.Json.Nodes;
using FlyGiftBackend.Services.Booking;

namespace FlyGiftBackend.Services.Flights.Kiwi
{
    /// <summary>
    /// Tequila Booking API orchestrator:
    /// <c>check_flights</c> → <c>save_booking</c> → <c>confirm_payment</c>.
    /// Sandbox uses <c>payu</c> + <c>test_payments=1</c>; deposit partners
    /// skip confirm in test because Kiwi only allows deposit confirm on live.
    /// </summary>
    public sealed class KiwiFlightBookingProvider : IFlightBookingProvider
    {
        private readonly KiwiApiClient _api;
        private readonly KiwiOptions _opts;
        private readonly ILogger<KiwiFlightBookingProvider> _log;

        private static readonly JsonSerializerOptions JsonOpts = new()
        {
            PropertyNameCaseInsensitive = true,
        };

        public KiwiFlightBookingProvider(
            KiwiApiClient api,
            Microsoft.Extensions.Options.IOptions<KiwiOptions> opts,
            ILogger<KiwiFlightBookingProvider> log)
        {
            _api = api;
            _opts = opts.Value;
            _log = log;
        }

        public string ProviderName => $"Kiwi.com Booking ({_opts.Mode})";

        public async Task<BookOrderResult> BookAsync(BookOrderRequest request, CancellationToken ct)
        {
            var token = request.Offer.ProviderToken;
            if (string.IsNullOrWhiteSpace(token))
                throw new OfferNoLongerAvailableException();

            var contactEmail = ResolveContactEmail(request);
            ValidateBookingEmail(contactEmail);
            var contactPhone = NormalizePhone(request.ContactPhone);

            JsonNode checkNode;
            TequilaCheckFlightsResponse check;
            string? sessionId = null;
            var attempts = 0;
            var passengerCount = request.Passengers.Count;
            do
            {
                attempts++;
                var qs = new Dictionary<string, string>
                {
                    ["booking_token"] = token!,
                    ["bnum"] = "0",
                    ["pnum"] = passengerCount.ToString(CultureInfo.InvariantCulture),
                    ["adults"] = passengerCount.ToString(CultureInfo.InvariantCulture),
                    ["children"] = "0",
                    ["infants"] = "0",
                    ["currency"] = _opts.Currency,
                };
                if (!string.IsNullOrWhiteSpace(sessionId))
                    qs["session_id"] = sessionId;

                checkNode = await _api.GetJsonNodeAsync("v2/booking/check_flights", qs, ct);
                check = checkNode.Deserialize<TequilaCheckFlightsResponse>(JsonOpts)
                    ?? throw new KiwiApiException("check_flights response empty.", "empty_response");

                sessionId ??= check.SessionId ?? checkNode["session_id"]?.GetValue<string>();

                if (check.FlightsInvalid)
                    throw new OfferNoLongerAvailableException();

                if (check.PriceChecked == true || check.FlightsChecked) break;

                if (attempts >= 5)
                {
                    _log.LogWarning(
                        "Tequila check_flights did not stabilise after {N} attempts for token {Token}",
                        attempts, Truncate(token, 12));
                    break;
                }

                await Task.Delay(750, ct);
            } while (true);

            var currency = string.IsNullOrWhiteSpace(check.Currency)
                ? _opts.Currency
                : check.Currency!;

            var newTotal = check.Total > 0 ? check.Total : request.Offer.Price.Total;

            if (Math.Round(newTotal, 2) != Math.Round(request.AgreedPrice, 2))
            {
                _log.LogInformation(
                    "Tequila price changed: agreed={Agreed} new={New} {Currency} token={Token}",
                    request.AgreedPrice, newTotal, currency, Truncate(token, 12));
                throw new PriceChangedException(request.AgreedPrice, newTotal, currency);
            }

            var refreshedToken = string.IsNullOrWhiteSpace(check.BookingToken) ? token! : check.BookingToken!;
            if (string.IsNullOrWhiteSpace(sessionId))
            {
                _log.LogWarning("Tequila check_flights returned no session_id for token {Token}", Truncate(token, 12));
                throw new KiwiApiException("חסר session_id מספק הטיסות.", "missing_session_id");
            }

            var baggage = BuildBaggageSelections(checkNode, passengerCount);
            if (baggage.Count == 0)
                _log.LogWarning("Tequila check_flights returned no baggage combinations for token {Token}", Truncate(token, 12));

            var paymentGateway = _opts.UseTestPayments
                ? "payu"
                : TequilaSaveBookingRequest.DepositGateway;

            var saveNode = await _api.PostJsonNodeAsync(
                "v2/booking/save_booking",
                new TequilaSaveBookingRequest
                {
                    BookingToken = refreshedToken,
                    SessionId = sessionId,
                    Lang = MapLang(_opts.Locale),
                    Locale = _opts.Locale,
                    Currency = currency,
                    PaymentGateway = paymentGateway,
                    HealthDeclarationChecked = true,
                    Passengers = request.Passengers
                        .Select(p => MapPassenger(p, contactEmail, contactPhone))
                        .ToList(),
                    Baggage = baggage,
                },
                ct);

            var save = TequilaBookingResponseParser.ParseSaveBooking(saveNode);
            if (!save.Ok)
            {
                _log.LogWarning(
                    "Tequila save_booking failed: message={Message} body={Body}",
                    save.ErrorMessage, Truncate(saveNode.ToJsonString(), 400));
                throw MapSaveBookingFailure(save.ErrorMessage);
            }

            // Deposit partners reject payu confirm in sandbox; a successful
            // test_payments save is enough for demo bookings.
            if (!_opts.UseTestPayments)
            {
                var confirmNode = await _api.PostJsonNodeAsync(
                    "v2/booking/confirm_payment",
                    new TequilaConfirmPaymentRequest
                    {
                        BookingId = save.BookingId,
                        TransactionId = save.TransactionId,
                    },
                    ct);

                var confirm = TequilaBookingResponseParser.ParseConfirmPayment(confirmNode);
                if (!confirm.Ok)
                {
                    throw new KiwiApiException(
                        confirm.ErrorMessage ?? "confirm_payment נכשל.",
                        code: "confirm_payment_failed");
                }
            }
            else
            {
                _log.LogInformation(
                    "Tequila sandbox booking saved (confirm skipped): bookingId={BookingId}",
                    save.BookingId);
            }

            return new BookOrderResult
            {
                ProviderBookingId = save.BookingId.ToString(CultureInfo.InvariantCulture),
                Pnr = save.Pnr,
                FinalPrice = newTotal,
                Currency = currency,
                IsTest = _opts.UseTestPayments,
            };
        }

        private string ResolveContactEmail(BookOrderRequest request)
        {
            if (!string.IsNullOrWhiteSpace(request.ContactEmail))
                return request.ContactEmail.Trim();

            throw new InvalidOperationException("חסר כתובת דוא\"ל ליצירת קשר בהזמנה.");
        }

        internal static void ValidateBookingEmail(string email)
        {
            var lower = email.Trim().ToLowerInvariant();
            if (lower.EndsWith(".test", StringComparison.Ordinal)
                || lower.EndsWith("@flygift.app", StringComparison.Ordinal)
                || lower.EndsWith("@flygift.test", StringComparison.Ordinal)
                || lower.EndsWith("@example.com", StringComparison.Ordinal)
                || lower.EndsWith("@test.com", StringComparison.Ordinal))
            {
                throw new InvalidOperationException(
                    "כתובת הדוא\"ל אינה מתאימה להזמנת טיסות. השתמשו בכתובת Gmail/Outlook אמיתית.");
            }
        }

        private static Exception MapSaveBookingFailure(string? message)
        {
            if (!string.IsNullOrWhiteSpace(message)
                && message.Contains("Email is not deliverable", StringComparison.OrdinalIgnoreCase))
            {
                return new InvalidOperationException(
                    "כתובת הדוא\"ל אינה מתאימה לספק הטיסות. עדכנו את הפרופיל לכתובת Gmail/Outlook אמיתית.");
            }

            return new KiwiApiException(message ?? "save_booking נכשל.", code: "save_booking_failed");
        }

        private static string NormalizePhone(string? phone)
        {
            if (string.IsNullOrWhiteSpace(phone))
                return "+972500000000";

            var digits = new string(phone.Where(c => char.IsDigit(c) || c == '+').ToArray());
            if (digits.StartsWith("00", StringComparison.Ordinal))
                digits = "+" + digits[2..];
            if (!digits.StartsWith('+'))
                digits = digits.StartsWith('0') ? "+972" + digits.TrimStart('0') : "+" + digits;

            if (digits.Length < 9)
                return "+972500000000";

            return digits;
        }

        private static List<TequilaSaveBookingBaggageItem> BuildBaggageSelections(JsonNode checkNode, int passengerCount)
        {
            var result = new List<TequilaSaveBookingBaggageItem>();
            var combinations = checkNode["baggage"]?["combinations"];
            if (combinations is null) return result;

            foreach (var category in new[] { "hand_bag", "hold_bag" })
            {
                if (combinations[category]?.AsArray() is not { Count: > 0 } options)
                    continue;

                var combo = options[0]?.DeepClone();
                if (combo is null) continue;

                for (var p = 0; p < passengerCount; p++)
                {
                    result.Add(new TequilaSaveBookingBaggageItem
                    {
                        Combination = combo,
                        Passengers = new List<int> { p },
                    });
                }
            }

            return result;
        }

        private static TequilaPassenger MapPassenger(PassengerInfo p, string email, string phone)
        {
            return new TequilaPassenger
            {
                FirstName = p.FirstName.Trim(),
                LastName = string.IsNullOrWhiteSpace(p.LastName) ? p.FirstName.Trim() : p.LastName.Trim(),
                Title = "Mr",
                Birthday = p.BirthDate?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? "1990-01-01",
                Nationality = "IL",
                PassportNumber = string.IsNullOrWhiteSpace(p.PassportNumber) ? "000000000" : p.PassportNumber.Trim(),
                PassportExpiry = p.PassportExpiry?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? "2030-12-31",
                Category = "adult",
                Email = email,
                Phone = phone,
            };
        }

        private static string MapLang(string locale) =>
            locale.Length >= 2 ? locale[..2].ToLowerInvariant() : "en";

        private static string Truncate(string s, int max) => s.Length <= max ? s : s[..max] + "…";
    }
}
