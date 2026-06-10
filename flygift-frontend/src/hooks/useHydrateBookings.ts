"use client";

import { useEffect } from "react";
import { ApiUtils } from "@/utils/ApiUtils";
import { setBookings } from "@/lib/appStore";
import type { FlightStatus, Trip } from "@/lib/tripTypes";

/**
 * Hydrate `appStore.bookings` from `GET /api/Bookings/Mine`. Mounted by
 * the trips view so the timeline reflects the live DB instead of the
 * empty seed. Silent on failure — view falls back to "no bookings"
 * empty state.
 */

interface ApiFlightBooking {
    bookingId: number;
    status: string;
    flightNumber: string;
    carrier: string;
    origin: string;
    originCity: string;
    destination: string;
    destinationCity: string;
    departureUtc: string | null;
    arrivalUtc: string | null;
    gate: string | null;
    seat: string | null;
    terminal: string | null;
    bookingReference: string | null;
    totalCharged: number | null;
    currency: string | null;
    stops: number | null;
    flightStatus: string;
    isUpcoming: boolean;
    createdAt: string;
}

interface MineEnvelope {
    success: boolean;
    items?: ApiFlightBooking[];
}

const KNOWN_STATUSES: ReadonlySet<FlightStatus> = new Set<FlightStatus>([
    "On Time",
    "Delayed",
    "Boarding",
    "Gate Change",
    "Arrived",
    "Cancelled",
    "Unknown",
]);

function normalizeStatus(s: string): FlightStatus {
    return (KNOWN_STATUSES as Set<string>).has(s)
        ? (s as FlightStatus)
        : "Unknown";
}

function adapt(api: ApiFlightBooking): Trip {
    return {
        bookingId: api.bookingId,
        status: (api.status as Trip["status"]) ?? "Booked",
        flightNumber: api.flightNumber,
        carrier: api.carrier,
        origin: api.origin,
        originCity: api.originCity,
        destination: api.destination,
        destinationCity: api.destinationCity,
        departureUtc: api.departureUtc ?? undefined,
        arrivalUtc: api.arrivalUtc ?? undefined,
        gate: api.gate ?? null,
        seat: api.seat ?? null,
        terminal: api.terminal ?? null,
        bookingReference: api.bookingReference ?? null,
        totalCharged: api.totalCharged ?? null,
        currency: api.currency ?? null,
        stops: api.stops ?? null,
        flightStatus: normalizeStatus(api.flightStatus),
        isUpcoming: api.isUpcoming,
        createdAt: api.createdAt,
    };
}

export function useHydrateBookings(): void {
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const env = (await ApiUtils.get("Bookings/Mine").startRequest()) as MineEnvelope;
                if (cancelled) return;
                if (env?.success && Array.isArray(env.items)) {
                    setBookings(env.items.map(adapt));
                }
            } catch {
                // Silent — leave bookings empty rather than break render.
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);
}
