"use client";

import { useEffect } from "react";
import { ApiUtils } from "@/utils/ApiUtils";
import {
    setBookings,
    setCards,
    setTransactions,
    setUserDisplayName,
} from "@/lib/appStore";
import type { GiftCardVariant, MockGiftCard } from "@/lib/mockData";
import type { FlightStatus, Trip } from "@/lib/tripTypes";
import type { Transaction } from "@/lib/transactionTypes";

interface ApiUserPublicDto {
    id: number;
    displayName: string;
}

interface ApiGiftCard {
    id: number;
    shortCode: string;
    amount: number;
    currency: string;
    status: string;
    expirationDate: string;
    createdAt: string;
    flightSnapshot: string | null;
    sender?: ApiUserPublicDto | null;
    recipient?: ApiUserPublicDto | null;
    recipientEmail?: string | null;
    recipientName?: string | null;
}

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

interface BootstrapPayload {
    profile?: {
        firstName?: string | null;
        lastName?: string | null;
        fullName?: string;
    };
    transactions?: Transaction[];
    giftCards?: ApiGiftCard[];
    bookings?: ApiFlightBooking[];
}

interface BootstrapEnvelope {
    success?: boolean;
    data?: BootstrapPayload;
    Data?: BootstrapPayload;
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

function parseSnapshot(json: string | null | undefined) {
    if (!json) return {};
    try {
        return JSON.parse(json) as {
            recipientName?: string;
            message?: string | null;
            variant?: GiftCardVariant;
            category?: "Flights" | "Hotels" | "Travel";
            originIata?: string;
            destinationIata?: string;
        };
    } catch {
        return {};
    }
}

function adaptGift(api: ApiGiftCard): MockGiftCard {
    const snap = parseSnapshot(api.flightSnapshot);
    return {
        id: String(api.id),
        code: api.shortCode,
        amount: api.amount,
        currency: api.currency,
        status: api.status as MockGiftCard["status"],
        variant: snap.variant ?? "cyan-jet",
        category: snap.category ?? "Flights",
        senderName: api.sender?.displayName?.trim() || "FlyGift",
        recipientName: api.recipientName ?? snap.recipientName ?? "",
        expirationDate: api.expirationDate,
        createdAt: api.createdAt,
        message: snap.message ?? undefined,
        originIata: snap.originIata,
        destinationIata: snap.destinationIata,
    };
}

function adaptBooking(api: ApiFlightBooking): Trip {
    const status = KNOWN_STATUSES.has(api.flightStatus as FlightStatus)
        ? (api.flightStatus as FlightStatus)
        : "Unknown";
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
        flightStatus: status,
        isUpcoming: api.isUpcoming,
        createdAt: api.createdAt,
    };
}

/**
 * One API call on app boot — replaces separate profile, transactions,
 * gifts, and bookings hydrates (4 round-trips → 1).
 */
export function useHydrateBootstrap(): void {
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const env = (await ApiUtils.get("App/Bootstrap").startRequest()) as BootstrapEnvelope;
                if (cancelled || env?.success === false) return;
                const payload = env.data ?? env.Data;
                if (!payload) return;

                if (Array.isArray(payload.transactions)) {
                    setTransactions(payload.transactions);
                }
                if (Array.isArray(payload.giftCards)) {
                    setCards(payload.giftCards.map(adaptGift));
                }
                if (Array.isArray(payload.bookings)) {
                    setBookings(payload.bookings.map(adaptBooking));
                }
                if (payload.profile) {
                    const name =
                        payload.profile.fullName?.trim() ||
                        [payload.profile.firstName, payload.profile.lastName]
                            .filter(Boolean)
                            .join(" ")
                            .trim();
                    if (name) setUserDisplayName(name);
                }
            } catch {
                // Silent — pages fall back to empty store.
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);
}
