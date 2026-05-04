namespace FlyGiftBackend.Services.Flights
{
    /// <summary>
    /// Static IATA airport directory used for autocomplete + validation in
    /// the mock flow. In production, replace with a Duffel /places call or
    /// a seeded DB table.
    /// </summary>
    public static class AirportDirectory
    {
        public static readonly Airport[] All =
        {
            new() { Iata = "TLV", Name = "Ben Gurion",          City = "Tel Aviv",  Country = "Israel" },
            new() { Iata = "JFK", Name = "John F. Kennedy",     City = "New York",  Country = "United States" },
            new() { Iata = "LAX", Name = "Los Angeles Intl",    City = "Los Angeles", Country = "United States" },
            new() { Iata = "LHR", Name = "Heathrow",            City = "London",    Country = "United Kingdom" },
            new() { Iata = "CDG", Name = "Charles de Gaulle",   City = "Paris",     Country = "France" },
            new() { Iata = "FRA", Name = "Frankfurt",           City = "Frankfurt", Country = "Germany" },
            new() { Iata = "DXB", Name = "Dubai Intl",          City = "Dubai",     Country = "UAE" },
            new() { Iata = "SIN", Name = "Changi",              City = "Singapore", Country = "Singapore" },
            new() { Iata = "NRT", Name = "Narita",              City = "Tokyo",     Country = "Japan" },
            new() { Iata = "HND", Name = "Haneda",              City = "Tokyo",     Country = "Japan" },
            new() { Iata = "SFO", Name = "San Francisco Intl",  City = "San Francisco", Country = "United States" },
            new() { Iata = "MIA", Name = "Miami Intl",          City = "Miami",     Country = "United States" },
            new() { Iata = "BCN", Name = "El Prat",             City = "Barcelona", Country = "Spain" },
            new() { Iata = "FCO", Name = "Fiumicino",           City = "Rome",      Country = "Italy" },
            new() { Iata = "AMS", Name = "Schiphol",            City = "Amsterdam", Country = "Netherlands" },
            new() { Iata = "ZRH", Name = "Zurich",              City = "Zurich",    Country = "Switzerland" },
            new() { Iata = "IST", Name = "Istanbul Airport",    City = "Istanbul",  Country = "Turkey" },
            new() { Iata = "ATH", Name = "Eleftherios Venizelos", City = "Athens",  Country = "Greece" },
            new() { Iata = "BKK", Name = "Suvarnabhumi",        City = "Bangkok",   Country = "Thailand" },
            new() { Iata = "HKG", Name = "Hong Kong Intl",      City = "Hong Kong", Country = "Hong Kong" },
        };

        public static Airport? Find(string iata) =>
            All.FirstOrDefault(a => string.Equals(a.Iata, iata, StringComparison.OrdinalIgnoreCase));

        public static IEnumerable<Airport> Search(string query, int limit = 10)
        {
            if (string.IsNullOrWhiteSpace(query)) return All.Take(limit);
            var q = query.Trim();
            return All
                .Where(a =>
                    a.Iata.Contains(q, StringComparison.OrdinalIgnoreCase) ||
                    a.City.Contains(q, StringComparison.OrdinalIgnoreCase) ||
                    a.Name.Contains(q, StringComparison.OrdinalIgnoreCase) ||
                    a.Country.Contains(q, StringComparison.OrdinalIgnoreCase))
                .Take(limit);
        }
    }
}
