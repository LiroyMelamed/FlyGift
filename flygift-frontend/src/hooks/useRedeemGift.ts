"use client";

import { useState, useCallback } from "react";
import { ApiUtils } from "@/utils/ApiUtils";
import {
    applyRedeemFromApi,
    redeemCard as redeemCardInStore,
} from "@/lib/appStore";

export interface RedeemResult {
    success: boolean;
    message: string;
    redeemedAt?: string;
}

interface RedeemEnvelope {
    success?: boolean;
    Success?: boolean;
    response?: string;
    Response?: string;
    data?: { amount?: number; currency?: string };
    Data?: { amount?: number; currency?: string };
    giftCard?: { amount?: number; currency?: string };
    GiftCard?: { amount?: number; currency?: string };
}

function readAmount(res: RedeemEnvelope, fallback = 0): number {
    const data = res.data ?? res.Data;
    const gift = res.giftCard ?? res.GiftCard;
    return data?.amount ?? gift?.amount ?? fallback;
}

function readCurrency(res: RedeemEnvelope, fallback = "USD"): string {
    const data = res.data ?? res.Data;
    const gift = res.giftCard ?? res.GiftCard;
    return data?.currency ?? gift?.currency ?? fallback;
}

/**
 * Hook to redeem a gift card. The backend is the source of truth —
 * local store updates only after a successful API response.
 */
export function useRedeemGift() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<RedeemResult | null>(null);

    const reset = useCallback(() => {
        setIsLoading(false);
        setError(null);
        setResult(null);
    }, []);

    const redeem = useCallback(
        async (giftCardId: string, code?: string, senderName?: string): Promise<RedeemResult> => {
            setIsLoading(true);
            setError(null);
            setResult(null);
            try {
                const numericId = Number(giftCardId);
                const isNumericId =
                    Number.isInteger(numericId) && numericId > 0 && /^\d+$/.test(giftCardId);

                const body: Record<string, unknown> = {};
                if (code?.trim()) {
                    const normalized = code.trim().toUpperCase();
                    body.code = normalized;
                    body.Code = normalized;
                }
                if (isNumericId) {
                    body.giftCardId = numericId;
                    body.GiftCardId = numericId;
                }

                if (!body.Code && !body.GiftCardId) {
                    throw new Error("מימוש נכשל — חסר מזהה מתנה.");
                }

                const res = (await ApiUtils.post("GiftCard/Redeem", body).startRequest()) as RedeemEnvelope;

                const ok = res.success ?? res.Success;
                if (!ok) {
                    throw new Error(res.response || res.Response || "מימוש נכשל.");
                }

                const amount = readAmount(res);
                const currency = readCurrency(res);

                const dispatched = redeemCardInStore(giftCardId);
                if (!dispatched.ok) {
                    applyRedeemFromApi({
                        cardId: giftCardId,
                        amount,
                        currency,
                        senderName,
                    });
                }

                const success: RedeemResult = {
                    success: true,
                    message: res.response || res.Response || "כרטיס המתנה מומש בהצלחה.",
                    redeemedAt: dispatched.redeemedAt ?? new Date().toISOString(),
                };
                setResult(success);
                return success;
            } catch (e) {
                const err = e as {
                    response?: { data?: { response?: string; Response?: string } };
                    message?: string;
                };
                const msg =
                    err?.response?.data?.response ||
                    err?.response?.data?.Response ||
                    (e instanceof Error ? e.message : "מימוש נכשל.");
                setError(msg);
                const failed: RedeemResult = { success: false, message: msg };
                setResult(failed);
                return failed;
            } finally {
                setIsLoading(false);
            }
        },
        []
    );

    return { redeem, reset, isLoading, error, result };
}
