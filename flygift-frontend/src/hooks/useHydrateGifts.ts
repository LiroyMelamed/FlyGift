"use client";

import { useEffect } from "react";
import { ApiUtils } from "@/utils/ApiUtils";
import { setCards } from "@/lib/appStore";
import type { GiftCardVariant, MockGiftCard } from "@/lib/mockData";

/**
 * Hydrate `appStore.cards` from `GET /api/GiftCard/Mine`. Mounted by
 * the dashboard so the carousel + KPI counters reflect the live DB
 * instead of an empty seed. Silent on failure — the dashboard remains
 * usable with an empty cards array.
 */

// Backend's UserPublicDto — sanitized projection from Slice 5.
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

interface MineEnvelope {
    success: boolean;
    items?: ApiGiftCard[];
}

interface FlightSnapshot {
    recipientName?: string;
    recipientEmail?: string;
    message?: string | null;
    variant?: GiftCardVariant;
    category?: "Flights" | "Hotels" | "Travel";
    senderName?: string;
    originIata?: string;
    destinationIata?: string;
}

function parseSnapshot(json: string | null | undefined): FlightSnapshot {
    if (!json) return {};
    try {
        return JSON.parse(json) as FlightSnapshot;
    } catch {
        return {};
    }
}

function adapt(api: ApiGiftCard): MockGiftCard {
    const snap = parseSnapshot(api.flightSnapshot);
    // Backend's UserPublicDto already composed the display name
    // (FirstName+LastName → UserName → "FlyGift"); we just use it.
    const senderName =
        api.sender?.displayName?.trim() || snap.senderName?.trim() || "FlyGift";
    return {
        id: String(api.id),
        code: api.shortCode,
        amount: api.amount,
        currency: api.currency,
        status: api.status as MockGiftCard["status"],
        variant: snap.variant ?? "cyan-jet",
        category: snap.category ?? "Flights",
        senderName,
        recipientName: api.recipientName ?? snap.recipientName ?? "",
        expirationDate: api.expirationDate,
        createdAt: api.createdAt,
        message: snap.message ?? undefined,
        originIata: snap.originIata,
        destinationIata: snap.destinationIata,
    };
}

export function useHydrateGifts(): void {
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const env = (await ApiUtils.get("GiftCard/Mine").startRequest()) as MineEnvelope;
                if (cancelled) return;
                if (env?.success && Array.isArray(env.items)) {
                    setCards(env.items.map(adapt));
                }
            } catch {
                // Silent — leave the store empty rather than break render.
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);
}
