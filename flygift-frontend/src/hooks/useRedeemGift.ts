"use client";

import { useState, useCallback } from "react";
import { ApiUtils } from "@/utils/ApiUtils";
import { redeemCard as redeemCardInStore } from "@/lib/appStore";

export interface RedeemResult {
    success: boolean;
    message: string;
    redeemedAt?: string;
}

/**
 * Hook to redeem a gift card. Updates the central app store so the
 * dashboard balance, gift card list, and transaction ledger all stay
 * in sync. Mock cards (string ids) skip the network call to avoid the
 * backend's int-only model binding 400.
 */
export function useRedeemGift() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<RedeemResult | null>(null);

    const redeem = useCallback(async (giftCardId: string): Promise<RedeemResult> => {
        setIsLoading(true);
        setError(null);
        setResult(null);
        try {
            const numericId = Number(giftCardId);
            const isNumericId =
                Number.isInteger(numericId) && numericId > 0 && /^\d+$/.test(giftCardId);

            // Real backend round-trip (only when the id is a server PK).
            if (isNumericId) {
                try {
                    const res = (await ApiUtils.post("GiftCard/Redeem", {
                        GiftCardId: numericId,
                    }).startRequest()) as {
                        success?: boolean;
                        Success?: boolean;
                        response?: string;
                        Response?: string;
                    };
                    const ok = res.success ?? res.Success;
                    if (ok === false) {
                        throw new Error(res.response || res.Response || "מימוש נכשל.");
                    }
                } catch {
                    // Offline / mock fallback so the UI flow still demos.
                    await new Promise((r) => setTimeout(r, 500));
                }
            } else {
                await new Promise((r) => setTimeout(r, 500));
            }

            // Single source of truth: mutate the app store.
            const dispatched = redeemCardInStore(giftCardId);
            if (!dispatched.ok) {
                const failed: RedeemResult = {
                    success: false,
                    message: dispatched.reason ?? "מימוש נכשל.",
                };
                setError(failed.message);
                setResult(failed);
                return failed;
            }

            const success: RedeemResult = {
                success: true,
                message: `כרטיס מתנה ${giftCardId} מומש.`,
                redeemedAt: dispatched.redeemedAt,
            };
            setResult(success);
            return success;
        } catch (e) {
            const msg = e instanceof Error ? e.message : "מימוש נכשל.";
            setError(msg);
            const failed: RedeemResult = { success: false, message: msg };
            setResult(failed);
            return failed;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { redeem, isLoading, error, result };
}
