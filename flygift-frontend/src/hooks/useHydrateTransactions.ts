"use client";

import { useEffect } from "react";
import { ApiUtils } from "@/utils/ApiUtils";
import { setTransactions } from "@/lib/appStore";
import type { Transaction } from "@/lib/transactionTypes";

interface MineEnvelope {
    success: boolean;
    items?: Transaction[];
}

/**
 * Hydrate `appStore.transactions` from `GET /api/Transaction/Mine` so
 * the ledger view, dashboard balance ribbon, and transaction history
 * all reflect server state — including ledger entries written by
 * server-side flows (flight/hotel bookings, gift redemptions, top-ups)
 * that the frontend wouldn't otherwise know about.
 *
 * Silent on failure — view falls back to whatever is already in the
 * local store rather than blowing up.
 */
export function useHydrateTransactions(): void {
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const env = (await ApiUtils.get(
                    "Transaction/Mine",
                ).startRequest()) as MineEnvelope;
                if (cancelled) return;
                if (env?.success && Array.isArray(env.items)) {
                    setTransactions(env.items);
                }
            } catch {
                // Silent — keep whatever the local store already has.
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);
}
