import type {
    Airport,
    FlightOffer,
    FlightSearchRequest,
    FlightSearchResponse,
} from "./flightTypes";
import { findAirportApi } from "./airportsApi";
import { t } from "@/i18n/he";

const CARRIERS = [
    { iata: "LY", name: "El Al", logoUrl: "/carriers/ly.svg" },
    { iata: "AF", name: "Air France", logoUrl: "/carriers/af.svg" },
    { iata: "BA", name: "British Airways", logoUrl: "/carriers/ba.svg" },
    { iata: "LH", name: "Lufthansa", logoUrl: "/carriers/lh.svg" },
    { iata: "DL", name: "Delta", logoUrl: "/carriers/dl.svg" },
    { iata: "EK", name: "Emirates", logoUrl: "/carriers/ek.svg" },
];

function seedFrom(s: string) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
}
function rngFromSeed(seed: number) {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 0xffffffff;
    };
}

function generateOffers(
    req: FlightSearchRequest,
    origin: Airport,
    destination: Airport
): FlightOffer[] {

    const seed = seedFrom(`${req.origin}-${req.destination}-${req.departureDate}`);
    const rng = rngFromSeed(seed);
    const offers: FlightOffer[] = [];

    for (let i = 0; i < 6; i++) {
        const carrier = CARRIERS[(seed + i) % CARRIERS.length];
        const stops = i < 2 ? 0 : i < 4 ? 1 : 2;
        const base = Math.round(180 + rng() * 600 + (stops === 0 ? 60 : 0));
        const taxes = Math.round(base * 0.18);
        const total = base + taxes;

        const dep = new Date(req.departureDate + "T00:00:00Z");
        dep.setUTCHours(6 + i * 2 + Math.floor(rng() * 2));
        const duration = 180 + Math.floor(rng() * 240) + stops * 90;
        const arr = new Date(dep.getTime() + duration * 60_000);

        const flightNumber = `${carrier.iata}${100 + Math.floor(rng() * 899)}`;

        const seg = {
            flightNumber,
            marketingCarrier: carrier,
            origin: { ...origin },
            destination: { ...destination },
            departureUtc: dep.toISOString(),
            arrivalUtc: arr.toISOString(),
            aircraft: rng() > 0.5 ? "Boeing 787" : "Airbus A350",
        };

        const id =
            "mock_" +
            btoa(JSON.stringify({ k: `${req.origin}-${req.destination}-${req.departureDate}-${i}` }))
                .replace(/=+$/, "")
                .replace(/\+/g, "-")
                .replace(/\//g, "_");

        offers.push({
            id,
            source: "Mock",
            carrier,
            stops,
            totalDurationMinutes: duration,
            slices: [
                {
                    origin: { ...origin },
                    destination: { ...destination },
                    departureUtc: dep.toISOString(),
                    arrivalUtc: arr.toISOString(),
                    durationMinutes: duration,
                    segments: [seg],
                },
            ],
            price: {
                base,
                taxes,
                total,
                currency: "USD",
                marketMedian: Math.round(total * (1 + (Math.floor(rng() * 25) - 5) / 100)),
            },
            isBestPrice: false,
            expiresAt: new Date(Date.now() + 20 * 60_000).toISOString(),
        });
    }

    // Best-price tagging: ≥5% below median
    const sorted = [...offers].sort((a, b) => a.price.total - b.price.total);
    const cheapest = sorted[0];
    const median = sorted[Math.floor(sorted.length / 2)].price.marketMedian;
    if (median > 0) {
        const delta = (median - cheapest.price.total) / median;
        if (delta >= 0.05) {
            cheapest.isBestPrice = true;
            cheapest.bestPriceReason = `${Math.round(delta * 100)}% below market`;
        }
    }
    return sorted;
}

async function resolveAirports(
    req: FlightSearchRequest
): Promise<{ origin: Airport; destination: Airport }> {
    const [o, d] = await Promise.all([
        findAirportApi(req.origin),
        findAirportApi(req.destination),
    ]);
    if (!o || !d) throw new Error(t.common.dbError);
    const toAirport = (a: NonNullable<typeof o>): Airport => ({
        iata: a.iata,
        name: a.name,
        city: a.city,
        country: a.country,
    });
    return { origin: toAirport(o), destination: toAirport(d) };
}

export const mockFlightApi = {
    async search(req: FlightSearchRequest): Promise<FlightSearchResponse> {
        const { origin, destination } = await resolveAirports(req);
        await new Promise((r) => setTimeout(r, 400));
        return {
            searchId: Math.random().toString(36).slice(2),
            generatedAt: new Date().toISOString(),
            offers: generateOffers(req, origin, destination),
        };
    },
    async getOffer(
        id: string,
        req: FlightSearchRequest
    ): Promise<FlightOffer | undefined> {
        const { origin, destination } = await resolveAirports(req);
        const offers = generateOffers(req, origin, destination);
        return offers.find((o) => o.id === id);
    },
};
