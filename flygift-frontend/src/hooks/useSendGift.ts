"use client";

import { useState, useCallback } from "react";
import type { GiftCardVariant } from "@/lib/mockData";
import { recordSpend, selectWalletBalance } from "@/lib/appStore";

export interface SendGiftPayload {
    recipientName: string;
    recipientEmail: string;
    message?: string;
    amount: number;
    currency: string;
    variant: GiftCardVariant;
    category: "Flights" | "Hotels" | "Travel";
    expirationDate: string;
}

export interface SendGiftResult {
    success: boolean;
    giftCardId?: string;
    code?: string;
    message: string;
}

/**
 * Generate a cryptographically-stronger gift code than Math.random.
 * Format: FG-XXXX-XXXX (uppercase base32-ish from crypto.getRandomValues).
 * Falls back to Math.random on older runtimes.
 */
function generateGiftCode(): string {
    const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/1/I/O for legibility
    const buf = new Uint8Array(8);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
        crypto.getRandomValues(buf);
    } else {
        for (let i = 0; i < buf.length; i++) buf[i] = Math.floor(Math.random() * 256);
    }
    let s = "";
    for (let i = 0; i < buf.length; i++) s += ALPHA[buf[i] % ALPHA.length];
    return `FG-${s.slice(0, 4)}-${s.slice(4, 8)}`;
}

/**
 * Hook to send a gift card.
 *
 * The wallet balance is debited *only* after the (mock) API resolves
 * with success — guaranteeing we never charge a user for a failed
 * purchase. In production, swap the simulated delay for a real call
 * to `POST /api/GiftCard/Purchase` and keep the same shape.
 */
export function useSendGift() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<SendGiftResult | null>(null);

    const send = useCallback(async (payload: SendGiftPayload) => {
        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            // Pre-flight: don't even attempt the call if the wallet can't
            // cover it. Fails fast in Hebrew with a clear message.
            const wallet = selectWalletBalance();
            if (payload.amount > wallet) {
                throw new Error(
                    `יתרה לא מספקת. נדרש ₪${payload.amount.toFixed(
                        2
                    )} ויש בחשבונך ₪${wallet.toFixed(2)}.`
                );
            }

            // ── Simulated mock (offline mode) ───────────────────────────
            await new Promise((r) => setTimeout(r, 1500));

            // ── Replace with real call when backend is reachable: ───────
            // const res = await ApiUtils.post("GiftCard/Purchase", { ... }).startRequest();
            // if (!res.success) throw new Error(res.response);
            // const code = res.data.code;
            // const giftCardId = String(res.data.giftCardId);

            const code = generateGiftCode();
            const giftCardId = "gc_" + Math.random().toString(36).slice(2, 10);

            // Only debit the wallet *after* the API confirmed success.
            recordSpend({
                amount: payload.amount,
                currency: payload.currency,
                description: `מתנה ל-${payload.recipientName}`,
                reference: `gift:${giftCardId}`,
            });

            const success: SendGiftResult = {
                success: true,
                giftCardId,
                code,
                message: "המתנה נשלחה בהצלחה.",
            };
            setResult(success);
            return success;
        } catch (e) {
            const msg = e instanceof Error ? e.message : "אירעה שגיאה. נסו שוב.";
            setError(msg);
            const failed: SendGiftResult = { success: false, message: msg };
            setResult(failed);
            return failed;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const reset = useCallback(() => {
        setError(null);
        setResult(null);
        setIsLoading(false);
    }, []);

    return { send, reset, isLoading, error, result };
}
