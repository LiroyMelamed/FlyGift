/**
 * Client for /api/airports/search — replaces the previous hardcoded
 * GLOBAL_AIRPORTS array. All airport lookups in the UI now go through
 * the live Next.js Route Handler (/api/airports/search) which queries
 * the bundled OurAirports dataset (4k+ airports).
 *
 * Keeps a tiny in-memory LRU so repeated keystrokes during typing
 * don't re-hit the route on every keypress.
 */

import { t } from "@/i18n/he";

export interface GlobalAirport {
    iata: string;
    name: string;
    city: string;
    cityHe: string;
    country: string;
    countryHe: string;
    lat?: number;
    lon?: number;
}

interface ApiResponse {
    results: GlobalAirport[];
    count: number;
}

const CACHE = new Map<string, GlobalAirport[]>();
const CACHE_MAX = 64;

function cacheGet(key: string) {
    const v = CACHE.get(key);
    if (v) {
        // refresh LRU
        CACHE.delete(key);
        CACHE.set(key, v);
    }
    return v;
}

function cacheSet(key: string, value: GlobalAirport[]) {
    if (CACHE.size >= CACHE_MAX) {
        const first = CACHE.keys().next().value;
        if (first) CACHE.delete(first);
    }
    CACHE.set(key, value);
}

/**
 * Live fuzzy search against /api/airports/search. Throws on network /
 * server failure with a Hebrew message — callers should show the
 * resulting `error.message` to the user.
 */
export async function searchAirportsApi(
    query: string,
    limit = 12,
    signal?: AbortSignal
): Promise<GlobalAirport[]> {
    const key = `${query.trim().toLowerCase()}::${limit}`;
    const hit = cacheGet(key);
    if (hit) return hit;

    const url = `/api/airports/search?q=${encodeURIComponent(
        query
    )}&limit=${limit}`;

    let res: Response;
    try {
        res = await fetch(url, { signal });
    } catch (e) {
        if ((e as Error).name === "AbortError") throw e;
        throw new Error(t.common.dbError);
    }
    if (!res.ok) throw new Error(t.common.dbError);
    const data = (await res.json()) as ApiResponse;
    cacheSet(key, data.results);
    return data.results;
}

/**
 * Look up an airport by IATA code via the same API. Used to hydrate
 * the combobox with a previously-selected value.
 */
export async function findAirportApi(
    iata: string,
    signal?: AbortSignal
): Promise<GlobalAirport | undefined> {
    if (!iata) return undefined;
    const results = await searchAirportsApi(iata, 5, signal);
    return results.find((a) => a.iata === iata.toUpperCase());
}
