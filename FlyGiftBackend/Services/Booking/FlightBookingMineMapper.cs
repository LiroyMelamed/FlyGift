using System.Text.Json;
using FlyGiftBackend.Controllers;
using FlyGiftBackend.Models;
using FlyGiftBackend.Services.Wallet;

namespace FlyGiftBackend.Services.Booking
{
    /// <summary>Shared projection for <c>GET /Bookings/Mine</c> and bootstrap.</summary>
    public static class FlightBookingMineMapper
    {
        private static readonly JsonSerializerOptions JsonOpts = new()
        {
            PropertyNameCaseInsensitive = true,
        };

        public static MineFlightBookingDto Map(FlightBooking b, DateTime now)
        {
            var pass = ParseBoardingData(b);

            decimal? totalCharged = null;
            string? currency = null;
            int? stops = null;
            if (!string.IsNullOrWhiteSpace(b.FlightDetails))
            {
                try
                {
                    using var doc = JsonDocument.Parse(b.FlightDetails);
                    var root = doc.RootElement;
                    if (root.TryGetProperty("Price", out var price) ||
                        root.TryGetProperty("price", out price))
                    {
                        if (price.TryGetProperty("Total", out var t) || price.TryGetProperty("total", out t))
                            totalCharged = t.GetDecimal();
                        if (price.TryGetProperty("Currency", out var c) || price.TryGetProperty("currency", out c))
                            currency = c.GetString();
                    }
                    if (root.TryGetProperty("Stops", out var sNum) ||
                        root.TryGetProperty("stops", out sNum))
                    {
                        if (sNum.ValueKind == JsonValueKind.Number) stops = sNum.GetInt32();
                    }
                }
                catch
                {
                    // Best-effort parse.
                }
            }

            var depUtc = pass?.DepartureUtc;
            var isUpcoming = depUtc.HasValue && depUtc.Value > now;
            var flightStatus = b.Status == BookingStatus.Cancelled
                ? "Cancelled"
                : isUpcoming ? "On Time" : (depUtc.HasValue ? "Arrived" : "Unknown");

            return new MineFlightBookingDto(
                b.Id,
                b.Status.ToString(),
                pass?.FlightNumber ?? "",
                pass?.Carrier ?? "",
                pass?.Origin ?? "",
                pass?.OriginCity ?? "",
                pass?.Destination ?? "",
                pass?.DestinationCity ?? "",
                pass?.DepartureUtc,
                pass?.ArrivalUtc,
                pass?.Gate,
                pass?.Seat,
                pass?.Terminal,
                pass?.BookingReference,
                totalCharged,
                currency,
                stops,
                flightStatus,
                isUpcoming,
                b.CreatedAt
            );
        }

        private static BoardingPassData? ParseBoardingData(FlightBooking booking)
        {
            if (string.IsNullOrWhiteSpace(booking.BoardingPassData)) return null;
            try
            {
                var trimmed = booking.BoardingPassData.TrimStart();
                if (trimmed.StartsWith('['))
                {
                    var arr = JsonSerializer.Deserialize<List<BoardingPassData>>(
                        booking.BoardingPassData, JsonOpts);
                    return arr is { Count: > 0 } ? arr[0] : null;
                }
                return JsonSerializer.Deserialize<BoardingPassData>(
                    booking.BoardingPassData, JsonOpts);
            }
            catch
            {
                return null;
            }
        }
    }
}
