using System.Text.Json.Nodes;
using System.Text.Json.Serialization;

namespace FlyGiftBackend.Services.Flights.Kiwi
{
    // Subset of the Tequila Booking API request/response shapes.
    // Reference: https://tequila.kiwi.com/portal/docs/tequila_api/booking_api
    //
    // We model only the fields we send or read. Tequila treats unknown
    // fields as no-ops, and the JsonSerializer's default ignore-on-write-
    // null option keeps optional fields out of the wire payload.

    // ---------- /v2/booking/check_flights ----------

    public sealed class TequilaCheckFlightsResponse
    {
        /// <summary>True when the price changed since the search response.</summary>
        [JsonPropertyName("price_change")] public bool PriceChange { get; set; }

        /// <summary>True when the itinerary is no longer bookable (sold out / time-elapsed).</summary>
        [JsonPropertyName("flights_invalid")] public bool FlightsInvalid { get; set; }

        /// <summary>True when the itinerary is fully bookable at the returned price.</summary>
        [JsonPropertyName("flights_checked")] public bool FlightsChecked { get; set; }

        /// <summary>Re-validated total in the requested currency.</summary>
        [JsonPropertyName("total")] public decimal Total { get; set; }

        /// <summary>Original total Tequila quoted at search time.</summary>
        [JsonPropertyName("flights_price")] public decimal? FlightsPrice { get; set; }

        [JsonPropertyName("currency")] public string? Currency { get; set; }

        [JsonPropertyName("booking_token")] public string? BookingToken { get; set; }

        /// <summary>
        /// Returned on the first check_flights call; must be echoed on
        /// subsequent check_flights and save_booking calls.
        /// </summary>
        [JsonPropertyName("session_id")] public string? SessionId { get; set; }

        /// <summary>True after the second call when Tequila has finalised availability checks.</summary>
        [JsonPropertyName("price_checked")] public bool? PriceChecked { get; set; }
    }

    // ---------- /v2/booking/save_booking ----------

    public sealed class TequilaSaveBookingRequest
    {
        [JsonPropertyName("booking_token")] public string BookingToken { get; set; } = "";
        [JsonPropertyName("session_id")] public string SessionId { get; set; } = "";
        [JsonPropertyName("lang")] public string Lang { get; set; } = "en";
        [JsonPropertyName("locale")] public string Locale { get; set; } = "en";
        [JsonPropertyName("currency")] public string Currency { get; set; } = "ILS";
        [JsonPropertyName("passengers")] public List<TequilaPassenger> Passengers { get; set; } = new();
        [JsonPropertyName("baggage")] public List<TequilaSaveBookingBaggageItem> Baggage { get; set; } = new();
        [JsonPropertyName("payment_gateway")] public string PaymentGateway { get; set; } = "payu";
        [JsonPropertyName("health_declaration_checked")] public bool HealthDeclarationChecked { get; set; } = true;
        /// <summary>
        /// Deposit-model bookings use the partner's Kiwi balance; <c>"deposit"</c>
        /// is the value Tequila expects in <see cref="PaymentGateway"/>.
        /// </summary>
        public static string DepositGateway => "deposit";
    }

    public sealed class TequilaPassenger
    {
        [JsonPropertyName("name")] public string FirstName { get; set; } = "";
        [JsonPropertyName("surname")] public string LastName { get; set; } = "";
        [JsonPropertyName("title")] public string Title { get; set; } = "Mr"; // Mr | Mrs
        [JsonPropertyName("birthday")] public string Birthday { get; set; } = ""; // YYYY-MM-DD
        [JsonPropertyName("nationality")] public string Nationality { get; set; } = "IL";
        [JsonPropertyName("cardno")] public string PassportNumber { get; set; } = "";
        [JsonPropertyName("expiration")] public string PassportExpiry { get; set; } = ""; // YYYY-MM-DD
        [JsonPropertyName("category")] public string Category { get; set; } = "adult"; // adult | child | infant
        [JsonPropertyName("email")] public string Email { get; set; } = "";
        [JsonPropertyName("phone")] public string Phone { get; set; } = "";
    }

    /// <summary>
    /// Tequila expects the full combination object from check_flights, not
    /// just an index. We pass it through as JsonNode to avoid re-modelling
    /// the upstream shape.
    /// </summary>
    public sealed class TequilaSaveBookingBaggageItem
    {
        [JsonPropertyName("combination")] public JsonNode? Combination { get; set; }
        [JsonPropertyName("passengers")] public List<int> Passengers { get; set; } = new();
    }

    public sealed class TequilaSaveBookingResponse
    {
        [JsonPropertyName("status")] public int Status { get; set; }
        [JsonPropertyName("status_message")] public string? StatusMessage { get; set; }

        /// <summary>Numeric Kiwi booking id. Persisted on FlightBooking.KiwiBookingId.</summary>
        [JsonPropertyName("booking_id")] public long BookingId { get; set; }

        [JsonPropertyName("pnr")] public string? Pnr { get; set; }

        /// <summary>Transaction id for confirm_payment (payu / test flow).</summary>
        [JsonPropertyName("transaction_id")] public string? TransactionId { get; set; }

        /// <summary>Token Tequila returns for the Zooz/PayU flow. Unused in the deposit model.</summary>
        [JsonPropertyName("payu_token")] public string? PayuToken { get; set; }
    }

    // ---------- /v2/booking/confirm_payment ----------

    public sealed class TequilaConfirmPaymentRequest
    {
        [JsonPropertyName("booking_id")] public long BookingId { get; set; }
        [JsonPropertyName("transaction_id")] public string? TransactionId { get; set; }
    }

    public sealed class TequilaConfirmPaymentResponse
    {
        [JsonPropertyName("status")] public int Status { get; set; }
        [JsonPropertyName("status_message")] public string? StatusMessage { get; set; }
        [JsonPropertyName("token")] public string? Token { get; set; }
    }
}
