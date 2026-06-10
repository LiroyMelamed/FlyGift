using System.Globalization;
using System.Text.Json.Nodes;

namespace FlyGiftBackend.Services.Flights.Kiwi
{
    internal static class TequilaBookingResponseParser
    {
        internal sealed record SaveBookingResult(
            bool Ok,
            long BookingId,
            string? Pnr,
            string? TransactionId,
            string? ErrorMessage);

        internal sealed record ConfirmPaymentResult(bool Ok, string? ErrorMessage);

        internal static SaveBookingResult ParseSaveBooking(JsonNode node)
        {
            var status = ReadStatus(node["status"]);
            var bookingId = node["booking_id"]?.GetValue<long>() ?? 0;
            var ok = status is "success" or "0" && bookingId > 0;

            if (ok)
            {
                return new SaveBookingResult(
                    true,
                    bookingId,
                    node["pnr"]?.GetValue<string>(),
                    ReadTransactionId(node["transaction_id"]),
                    null);
            }

            var message =
                node["message"]?.GetValue<string>()
                ?? node["msg"]?.GetValue<string>()
                ?? node["status_message"]?.GetValue<string>()
                ?? (status is "error" ? "save_booking נכשל." : null);

            return new SaveBookingResult(false, bookingId, null, null, message);
        }

        internal static ConfirmPaymentResult ParseConfirmPayment(JsonNode node)
        {
            var status = ReadStatus(node["status"]);
            var ok = status is "success" or "0";
            var message =
                node["message"]?.GetValue<string>()
                ?? node["msg"]?.GetValue<string>()
                ?? node["status_message"]?.GetValue<string>();
            return new ConfirmPaymentResult(ok, ok ? null : message);
        }

        internal static bool IsSaveSuccess(JsonNode node) => ParseSaveBooking(node).Ok;

        internal static string? ReadStatus(JsonNode? node)
        {
            if (node is null) return null;
            return node.GetValueKind() switch
            {
                System.Text.Json.JsonValueKind.String => node.GetValue<string>(),
                System.Text.Json.JsonValueKind.Number =>
                    node.GetValue<int>().ToString(CultureInfo.InvariantCulture),
                _ => null,
            };
        }

        private static string? ReadTransactionId(JsonNode? node)
        {
            if (node is null) return null;
            return node.GetValueKind() switch
            {
                System.Text.Json.JsonValueKind.String => node.GetValue<string>(),
                System.Text.Json.JsonValueKind.Number =>
                    node.GetValue<long>().ToString(CultureInfo.InvariantCulture),
                System.Text.Json.JsonValueKind.False or System.Text.Json.JsonValueKind.Null => null,
                _ => null,
            };
        }
    }
}
