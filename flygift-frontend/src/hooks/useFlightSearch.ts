"use client";

import { useState, useCallback } from "react";
import { mockFlightApi } from "@/lib/mockFlights";
import type {
    FlightSearchRequest,
    FlightSearchResponse,
} from "@/lib/flightTypes";

/**
 * Stage 12 — Flight search hook.
 *
 * Currently backed by `mockFlightApi`. To wire the real backend
 * endpoint (`POST /api/FlightSearch`), replace the body of `search`
 * with `ApiUtils.post("FlightSearch", req).startRequest()` — the
 * response shape already matches.
 */
export function useFlightSearch() {
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState<FlightSearchResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [lastRequest, setLastRequest] = useState<FlightSearchRequest | null>(null);

    const search = useCallback(async (req: FlightSearchRequest) => {
        setIsLoading(true);
        setError(null);
        setLastRequest(req);
        try {
            const res = await mockFlightApi.search(req);
            setData(res);
            return res;
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Search failed.";
            setError(msg);
            setData(null);
            throw e;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { search, isLoading, data, error, lastRequest };
}
