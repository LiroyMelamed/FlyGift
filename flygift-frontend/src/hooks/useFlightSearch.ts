"use client";

import { useState, useCallback } from "react";
import { flightApi } from "@/lib/flightApi";
import type {
    FlightSearchRequest,
    FlightSearchResponse,
} from "@/lib/flightTypes";

/**
 * Stage 12 — Flight search hook.
 *
 * Calls `POST /api/FlightSearch` on the backend, which fans out to every
 * registered provider (Kiwi Tequila in production, Mock in dev when no
 * API key is configured). Errors come back already translated to Hebrew
 * by the controller's Tequila → Hebrew mapping table.
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
            const res = await flightApi.search(req);
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
