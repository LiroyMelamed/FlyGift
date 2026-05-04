/**
 * Global airport / city directory — single source of truth used by:
 *  - Landing page CityField combobox
 *  - Flight search form (FlightSearchForm)
 *  - Mock flight provider (mockFlights.ts)
 *
 * Each entry has both English and Hebrew names so the UI can render
 * locale-appropriate labels without re-translating at the call site.
 *
 * Add new destinations here; every consumer picks them up automatically.
 */

export interface GlobalAirport {
    iata: string;
    name: string;
    city: string;
    cityHe: string;
    country: string;
    countryHe: string;
}

export const GLOBAL_AIRPORTS: GlobalAirport[] = [
    { iata: "TLV", name: "Ben Gurion", city: "Tel Aviv", cityHe: "תל אביב", country: "Israel", countryHe: "ישראל" },
    { iata: "JFK", name: "John F. Kennedy", city: "New York", cityHe: "ניו יורק", country: "USA", countryHe: "ארה״ב" },
    { iata: "LAX", name: "Los Angeles Intl", city: "Los Angeles", cityHe: "לוס אנג׳לס", country: "USA", countryHe: "ארה״ב" },
    { iata: "SFO", name: "San Francisco Intl", city: "San Francisco", cityHe: "סן פרנסיסקו", country: "USA", countryHe: "ארה״ב" },
    { iata: "MIA", name: "Miami Intl", city: "Miami", cityHe: "מיאמי", country: "USA", countryHe: "ארה״ב" },
    { iata: "ORD", name: "O'Hare", city: "Chicago", cityHe: "שיקגו", country: "USA", countryHe: "ארה״ב" },
    { iata: "LHR", name: "Heathrow", city: "London", cityHe: "לונדון", country: "UK", countryHe: "אנגליה" },
    { iata: "CDG", name: "Charles de Gaulle", city: "Paris", cityHe: "פריז", country: "France", countryHe: "צרפת" },
    { iata: "FRA", name: "Frankfurt", city: "Frankfurt", cityHe: "פרנקפורט", country: "Germany", countryHe: "גרמניה" },
    { iata: "BER", name: "Berlin Brandenburg", city: "Berlin", cityHe: "ברלין", country: "Germany", countryHe: "גרמניה" },
    { iata: "MUC", name: "Munich", city: "Munich", cityHe: "מינכן", country: "Germany", countryHe: "גרמניה" },
    { iata: "BCN", name: "El Prat", city: "Barcelona", cityHe: "ברצלונה", country: "Spain", countryHe: "ספרד" },
    { iata: "MAD", name: "Barajas", city: "Madrid", cityHe: "מדריד", country: "Spain", countryHe: "ספרד" },
    { iata: "FCO", name: "Fiumicino", city: "Rome", cityHe: "רומא", country: "Italy", countryHe: "איטליה" },
    { iata: "MXP", name: "Malpensa", city: "Milan", cityHe: "מילאנו", country: "Italy", countryHe: "איטליה" },
    { iata: "AMS", name: "Schiphol", city: "Amsterdam", cityHe: "אמסטרדם", country: "Netherlands", countryHe: "הולנד" },
    { iata: "ZRH", name: "Zurich", city: "Zurich", cityHe: "ציריך", country: "Switzerland", countryHe: "שווייץ" },
    { iata: "VIE", name: "Vienna Intl", city: "Vienna", cityHe: "וינה", country: "Austria", countryHe: "אוסטריה" },
    { iata: "PRG", name: "Václav Havel", city: "Prague", cityHe: "פראג", country: "Czechia", countryHe: "צ׳כיה" },
    { iata: "ATH", name: "Athens Intl", city: "Athens", cityHe: "אתונה", country: "Greece", countryHe: "יוון" },
    { iata: "IST", name: "Istanbul Airport", city: "Istanbul", cityHe: "איסטנבול", country: "Turkey", countryHe: "טורקיה" },
    { iata: "DXB", name: "Dubai Intl", city: "Dubai", cityHe: "דובאי", country: "UAE", countryHe: "איח״ע" },
    { iata: "DOH", name: "Hamad Intl", city: "Doha", cityHe: "דוחא", country: "Qatar", countryHe: "קטר" },
    { iata: "BKK", name: "Suvarnabhumi", city: "Bangkok", cityHe: "בנגקוק", country: "Thailand", countryHe: "תאילנד" },
    { iata: "SIN", name: "Changi", city: "Singapore", cityHe: "סינגפור", country: "Singapore", countryHe: "סינגפור" },
    { iata: "HKG", name: "Hong Kong Intl", city: "Hong Kong", cityHe: "הונג קונג", country: "Hong Kong", countryHe: "הונג קונג" },
    { iata: "NRT", name: "Narita", city: "Tokyo", cityHe: "טוקיו", country: "Japan", countryHe: "יפן" },
    { iata: "HND", name: "Haneda", city: "Tokyo", cityHe: "טוקיו", country: "Japan", countryHe: "יפן" },
    { iata: "ICN", name: "Incheon", city: "Seoul", cityHe: "סיאול", country: "Korea", countryHe: "דרום קוריאה" },
    { iata: "SYD", name: "Kingsford Smith", city: "Sydney", cityHe: "סידני", country: "Australia", countryHe: "אוסטרליה" },
    { iata: "GRU", name: "Guarulhos", city: "São Paulo", cityHe: "סאו פאולו", country: "Brazil", countryHe: "ברזיל" },
    { iata: "YYZ", name: "Pearson", city: "Toronto", cityHe: "טורונטו", country: "Canada", countryHe: "קנדה" },
];

/**
 * Fast prefix/substring search across IATA, city (en + he), country.
 * Designed for combobox autocomplete — bounded result count keeps render cheap.
 */
export function searchGlobalAirports(query: string, limit = 8): GlobalAirport[] {
    const q = query.trim().toLowerCase();
    if (!q) return GLOBAL_AIRPORTS.slice(0, limit);
    return GLOBAL_AIRPORTS.filter(
        (a) =>
            a.iata.toLowerCase().includes(q) ||
            a.city.toLowerCase().includes(q) ||
            a.cityHe.includes(q) ||
            a.name.toLowerCase().includes(q) ||
            a.country.toLowerCase().includes(q) ||
            a.countryHe.includes(q)
    ).slice(0, limit);
}

export function findAirport(iata: string): GlobalAirport | undefined {
    return GLOBAL_AIRPORTS.find((a) => a.iata === iata.toUpperCase());
}
