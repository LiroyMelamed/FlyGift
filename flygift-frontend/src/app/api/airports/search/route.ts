import { NextResponse } from "next/server";
import airportsRaw from "@/data/airports.json";

/**
 * GET /api/airports/search?q=<query>&limit=<n>
 *
 * Server-side fuzzy search across the OurAirports dataset (4k+ entries
 * with scheduled commercial service). Replaces the previous hardcoded
 * 32-entry GLOBAL_AIRPORTS array.
 *
 * Matching is case-insensitive and runs across IATA, name, city,
 * cityHe, country, countryHe. Results are ordered by airport size
 * (large > medium > small) — guaranteed by the build-time sort.
 */

interface RawAirport {
    iata: string;
    name: string;
    city: string;
    cityHe: string | null;
    country: string;
    countryHe: string | null;
    type: "large_airport" | "medium_airport" | "small_airport";
    lat: number;
    lon: number;
}

const ALL: readonly RawAirport[] = airportsRaw as RawAirport[];

export interface AirportSearchResult {
    iata: string;
    name: string;
    city: string;
    cityHe: string;
    country: string;
    countryHe: string;
    lat: number;
    lon: number;
}

function shape(a: RawAirport): AirportSearchResult {
    return {
        iata: a.iata,
        name: a.name,
        city: a.city,
        cityHe: a.cityHe ?? a.city,
        country: a.country,
        countryHe: a.countryHe ?? a.country,
        lat: a.lat,
        lon: a.lon,
    };
}

export async function GET(request: Request) {
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
    const limitParam = Number(url.searchParams.get("limit") ?? 12);
    const limit = Math.max(1, Math.min(50, limitParam || 12));

    if (!q) {
        // Empty query → top airports (large hubs, already sorted)
        return NextResponse.json({
            results: ALL.slice(0, limit).map(shape),
            count: ALL.length,
        });
    }

    // IATA exact match always wins
    const exact = ALL.find((a) => a.iata.toLowerCase() === q);

    // Score every entry, keep only matches, sort by score desc.
    type Scored = { airport: RawAirport; score: number; rank: number };
    const sizeRank: Record<RawAirport["type"], number> = {
        large_airport: 0,
        medium_airport: 1,
        small_airport: 2,
    };
    // Boost added to the relevance score so a major hub always
    // outranks a regional airport with an equally-good textual match.
    const sizeBoost: Record<RawAirport["type"], number> = {
        large_airport: 200,
        medium_airport: 60,
        small_airport: 0,
    };

    const scored: Scored[] = [];
    for (const a of ALL) {
        if (a === exact) continue;
        const iata = a.iata.toLowerCase();
        const city = a.city.toLowerCase();
        const country = a.country.toLowerCase();
        const name = a.name.toLowerCase();
        const cityHe = a.cityHe ?? "";
        const countryHe = a.countryHe ?? "";

        let score = 0;
        if (iata === q) score += 1000;
        else if (iata.startsWith(q)) score += 600;
        else if (iata.includes(q)) score += 250;

        if (city === q || cityHe === q) score += 700;
        else if (city.startsWith(q) || cityHe.startsWith(q)) score += 500;
        else if (city.includes(q) || cityHe.includes(q)) score += 250;

        if (country.startsWith(q) || countryHe.startsWith(q)) score += 80;
        else if (country.includes(q) || countryHe.includes(q)) score += 40;

        if (name.startsWith(q)) score += 60;
        else if (name.includes(q)) score += 20;

        if (score > 0) {
            score += sizeBoost[a.type];
            scored.push({ airport: a, score, rank: sizeRank[a.type] });
        }
    }

    scored.sort((a, b) => b.score - a.score || a.rank - b.rank);

    const matches: RawAirport[] = exact ? [exact] : [];
    for (const s of scored) {
        if (matches.length >= limit) break;
        matches.push(s.airport);
    }

    return NextResponse.json({
        results: matches.map(shape),
        count: matches.length,
    });
}
