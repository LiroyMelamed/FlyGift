"use client";

import { useState, useCallback } from "react";
import type { GiftCardVariant } from "@/lib/mockData";
import { recordSpend, selectWalletBalance } from "@/lib/appStore";
import { ApiUtils } from "@/utils/ApiUtils";

export interface SendGiftPayload {
    recipientName: string;
    recipientEmail: string;
    recipientId?: number; // optional — the wizard doesn't capture it yet
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
    /** Set when the failure was caused by insufficient wallet balance.
     * The wizard reads this to open the top-up modal instead of showing
     * a dead-end error. */
    needsTopUp?: { missingAmount: number; currency: string; required: number; available: number };
}

/**
 * Backend `GiftCardResponse` shape — extends `GeneralResponse` and adds
 * a `giftCard` sibling. `success`/`response` come from GeneralResponse.
 */
interface PurchaseEnvelope {
    success: boolean;
    response?: string;
    message?: string; // some endpoints emit `message`; tolerate both
    giftCard?: {
        id: number;
        shortCode: string;
        amount: number;
        currency: string;
        expirationDate: string;
        createdAt: string;
        flightSnapshot?: string | null;
    } | null;
}

/**
 * Hook to send a gift card.
 *
 * Debits the wallet *only* after `POST /api/GiftCard/Purchase` succeeds,
 * so a failed purchase never charges the user. The gift's `ShortCode`
 * (server-generated) is surfaced as the share code for `/gifts/{code}`.
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
            // Pre-flight: surface a structured "needs top-up" result when
            // the wallet can't cover the gift, instead of erroring out.
            // The wizard reacts by opening the payment modal.
            const wallet = selectWalletBalance();
            if (payload.amount > wallet) {
                const missingAmount = +(payload.amount - wallet).toFixed(2);
                const failed: SendGiftResult = {
                    success: false,
                    message: `יתרה לא מספקת. נדרש $${payload.amount.toFixed(2)} ויש בחשבונך $${wallet.toFixed(2)}.`,
                    needsTopUp: {
                        missingAmount,
                        currency: payload.currency,
                        required: payload.amount,
                        available: wallet,
                    },
                };
                setError(failed.message);
                setResult(failed);
                return failed;
            }

            // Freeze the gift's intent into FlightSnapshot so the recipient
            // page can render variant/category/message/sender info even if
            // live availability changes by redeem time.
            const flightSnapshot = JSON.stringify({
                recipientName: payload.recipientName,
                recipientEmail: payload.recipientEmail,
                message: payload.message ?? null,
                variant: payload.variant,
                category: payload.category,
            });

            const env = (await ApiUtils.post("GiftCard/Purchase", {
                recipientId: payload.recipientId ?? 0,
                recipientEmail: payload.recipientEmail,
                recipientName: payload.recipientName,
                amount: payload.amount,
                currency: payload.currency,
                expirationDate: payload.expirationDate,
                flightSnapshot,
            }).startRequest()) as PurchaseEnvelope & {
                data?: { code?: string; required?: number; available?: number; currency?: string };
            };

            if (!env?.success || !env.giftCard) {
                // Backend can also report insufficient balance after
                // crossing the network — handle it the same way.
                if (env?.data?.code === "insufficient_balance") {
                    const required = env.data.required ?? payload.amount;
                    const available = env.data.available ?? 0;
                    const failed: SendGiftResult = {
                        success: false,
                        message: env.response || env.message || "יתרה לא מספקת.",
                        needsTopUp: {
                            missingAmount: +(required - available).toFixed(2),
                            currency: env.data.currency ?? payload.currency,
                            required,
                            available,
                        },
                    };
                    setError(failed.message);
                    setResult(failed);
                    return failed;
                }
                throw new Error(
                    env?.response || env?.message || "אירעה שגיאה. נסו שוב."
                );
            }

            const code = env.giftCard.shortCode;
            const giftCardId = String(env.giftCard.id);

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
        } catch (e: unknown) {
            const err = e as {
                response?: { data?: { response?: string; message?: string } };
                message?: string;
            };
            const msg =
                err?.response?.data?.response ||
                err?.response?.data?.message ||
                err?.message ||
                "אירעה שגיאה. נסו שוב.";
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
