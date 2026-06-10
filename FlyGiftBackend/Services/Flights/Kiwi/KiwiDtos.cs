using System.Text.Json.Serialization;

namespace FlyGiftBackend.Services.Flights.Kiwi
{
    // Minimal subset of the Tequila Search API response. We only surface
    // the fields actually mapped onto FlightOffer; everything else is
    // ignored by JsonSerializer. Reference: https://tequila.kiwi.com/portal/docs/tequila_api/search_api

    public sealed class TequilaSearchResponse
    {
        [JsonPropertyName("currency")] public string? Currency { get; set; }
        [JsonPropertyName("data")] public List<TequilaItinerary> Data { get; set; } = new();
    }

    public sealed class TequilaItinerary
    {
        /// <summary>Stable opaque id Tequila uses for the booking handoff.</summary>
        [JsonPropertyName("id")] public string Id { get; set; } = "";

        [JsonPropertyName("flyFrom")] public string? FlyFrom { get; set; }
        [JsonPropertyName("flyTo")] public string? FlyTo { get; set; }
        [JsonPropertyName("cityFrom")] public string? CityFrom { get; set; }
        [JsonPropertyName("cityTo")] public string? CityTo { get; set; }
        [JsonPropertyName("countryFrom")] public TequilaCountry? CountryFrom { get; set; }
        [JsonPropertyName("countryTo")] public TequilaCountry? CountryTo { get; set; }

        /// <summary>Total price across all passengers, in <see cref="TequilaSearchResponse.Currency"/>.</summary>
        [JsonPropertyName("price")] public decimal Price { get; set; }

        /// <summary>Total itinerary duration in seconds — Tequila returns a tuple <c>{ departure, return, total }</c>.</summary>
        [JsonPropertyName("duration")] public TequilaDuration? Duration { get; set; }

        [JsonPropertyName("airlines")] public List<string> Airlines { get; set; } = new();

        /// <summary>Flat list of all segments for this itinerary, both directions.</summary>
        [JsonPropertyName("route")] public List<TequilaSegment> Route { get; set; } = new();

        /// <summary>Deep-link to Kiwi's booking flow. Used as a fallback when the booking API is not available.</summary>
        [JsonPropertyName("deep_link")] public string? DeepLink { get; set; }

        /// <summary>Optional booking-token Kiwi requires for the (paid) booking API. Not all keys receive this.</summary>
        [JsonPropertyName("booking_token")] public string? BookingToken { get; set; }
    }

    public sealed class TequilaCountry
    {
        [JsonPropertyName("code")] public string? Code { get; set; }
        [JsonPropertyName("name")] public string? Name { get; set; }
    }

    public sealed class TequilaDuration
    {
        [JsonPropertyName("departure")] public int DepartureSeconds { get; set; }
        [JsonPropertyName("return")] public int ReturnSeconds { get; set; }
        [JsonPropertyName("total")] public int TotalSeconds { get; set; }
    }

    public sealed class TequilaSegment
    {
        [JsonPropertyName("flyFrom")] public string? FlyFrom { get; set; }
        [JsonPropertyName("flyTo")] public string? FlyTo { get; set; }
        [JsonPropertyName("cityFrom")] public string? CityFrom { get; set; }
        [JsonPropertyName("cityTo")] public string? CityTo { get; set; }

        // Tequila returns ISO 8601 with a "Z" suffix (e.g. "2026-05-18T10:00:00.000Z").
        // The legacy API used `dTimeUTC` (epoch seconds); the modern API uses
        // `utc_departure` / `utc_arrival` and that's the only field actually
        // populated on responses. Mapping to DateTime parses cleanly.
        [JsonPropertyName("utc_departure")] public DateTime DepartureUtc { get; set; }
        [JsonPropertyName("utc_arrival")] public DateTime ArrivalUtc { get; set; }

        [JsonPropertyName("airline")] public string? Airline { get; set; }
        [JsonPropertyName("flight_no")] public int FlightNumber { get; set; }
        [JsonPropertyName("equipment")] public string? Equipment { get; set; }

        /// <summary>0 = outbound, 1 = return. Used to split <see cref="TequilaItinerary.Route"/> into FlyGift slices.</summary>
        [JsonPropertyName("return")] public int Return { get; set; }
    }

    /// <summary>Schema returned for HTTP 4xx errors: <c>{ "error": "message", "code": "..." }</c>.</summary>
    public sealed class TequilaError
    {
        [JsonPropertyName("error")] public string? Error { get; set; }
        [JsonPropertyName("code")] public string? Code { get; set; }
        [JsonPropertyName("message")] public string? Message { get; set; }
    }
}
