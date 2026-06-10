"use client";

import { useState, useCallback } from "react";
import { ApiUtils } from "@/utils/ApiUtils";
import type { BookFlightRequest, BookFlightResult } from "@/lib/flightTypes";
import { t } from "@/i18n/he";

interface ApiEnvelope<T> {
    success: boolean;
    message: string;
    path?: string;
    data?: T;
}

/**
 * Thrown when the backend rejected the booking because the wallet
 * doesn't cover the offer and no payment-method token was supplied.
 * The caller (FlightBookingFlow) catches this and forces the
 * card-input panel open instead of surfacing a dead-end toast.
 */
export class InsufficientBalanceError extends Error {
    readonly code = "insufficient_balance" as const;
    readonly missingAmount: number;
    readonly currency: string;
    constructor(message: string, missingAmount: number, currency: string) {
        super(message);
        this.name = "InsufficientBalanceError";
        this.missingAmount = missingAmount;
        this.currency = currency;
    }
}

/** Backend 409 — Kiwi re-checked the price; caller should confirm and retry. */
export class PriceChangedError extends Error {
    readonly code = "price_changed" as const;
    readonly oldPrice: number;
    readonly newPrice: number;
    readonly currency: string;
    constructor(message: string, oldPrice: number, newPrice: number, currency: string) {
        super(message);
        this.name = "PriceChangedError";
        this.oldPrice = oldPrice;
        this.newPrice = newPrice;
        this.currency = currency;
    }
}

/**
 * Stage 13 — Book a selected flight (live).
 *
 * Calls `POST /api/Bookings/BookFlight`. The backend re-resolves the
 * Tequila offer, debits the user's ledger balance, optionally charges a
 * card for any remainder, and writes the booking + boarding pass row
 * inside a single DB transaction (rolls back on provider failure).
 *
 * `opts` mirrors the legacy mock surface so callers don't need to change.
 * Most values are unused on the wire — the backend recomputes them from
 * the offer — but a few are echoed back for the success screen if the
 * API response is missing optional fields.
 */
export function useBookFlight() {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<BookFlightResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const book = useCallback(
        async (
            req: BookFlightRequest,
            opts: {
                offerTotal: number;
                currency: string;
                currentBalance: number;
                route: string;
                flightNumber: string;
                departureUtc: string;
            }
        ) => {
            setIsLoading(true);
            setError(null);
            try {
                const env = (await ApiUtils.post("Bookings/BookFlight", req).startRequest()) as
                    | (ApiEnvelope<BookFlightResult> & {
                          success?: boolean;
                          Success?: boolean;
                          response?: string;
                          Response?: string;
                      })
                    | BookFlightResult;

                const ok =
                    "success" in (env as object)
                        ? ((env as { success?: boolean; Success?: boolean }).success ??
                          (env as { success?: boolean; Success?: boolean }).Success)
                        : true;
                if (ok === false) {
                    throw new Error(
                        (env as { response?: string; Response?: string }).response ||
                            (env as { response?: string; Response?: string }).Response ||
                            t.common.bookingFailed,
                    );
                }

                const payload =
                    "data" in (env as object) && (env as ApiEnvelope<BookFlightResult>).data
                        ? (env as ApiEnvelope<BookFlightResult>).data!
                        : (env as BookFlightResult);

                if (!payload || typeof payload.bookingId !== "number") {
                    throw new Error(t.common.dbError);
                }

                // Backfill optional UI fields from the request opts so the
                // confirmation screen always has a route + flight number.
                const out: BookFlightResult = {
                    ...payload,
                    route: payload.route || opts.route,
                    flightNumber: payload.flightNumber || opts.flightNumber,
                    departureUtc: payload.departureUtc || opts.departureUtc,
                    currency: payload.currency || opts.currency,
                };
                setResult(out);
                return out;
            } catch (e: unknown) {
                const err = e as {
                    response?: {
                        status?: number;
                        data?: {
                            response?: string;
                            message?: string;
                            data?: {
                                code?: string;
                                missingAmount?: number;
                                oldPrice?: number;
                                newPrice?: number;
                                currency?: string;
                            };
                        };
                    };
                    message?: string;
                };
                const status = err?.response?.status;
                const msg =
                    err?.response?.data?.response ||
                    err?.response?.data?.message ||
                    (typeof status === "number" && status >= 502
                        ? t.common.apiUnavailable
                        : undefined) ||
                    (err?.message === "Network Error" ? t.common.apiUnavailable : undefined) ||
                    err?.message ||
                    t.common.bookingFailed;
                setError(msg);

                // Structured error: backend signals "needs payment method"
                // with `data.code = "insufficient_balance"` so we throw a
                // typed error the UI can react to without string parsing.
                const codeData = err?.response?.data?.data;
                if (codeData?.code === "insufficient_balance") {
                    throw new InsufficientBalanceError(
                        msg,
                        codeData.missingAmount ?? 0,
                        codeData.currency ?? opts.currency,
                    );
                }
                if (status === 409 && codeData?.code === "price_changed") {
                    throw new PriceChangedError(
                        msg,
                        codeData.oldPrice ?? opts.offerTotal,
                        codeData.newPrice ?? opts.offerTotal,
                        codeData.currency ?? opts.currency,
                    );
                }
                throw new Error(msg);
            } finally {
                setIsLoading(false);
            }
        },
        []
    );

    const reset = useCallback(() => {
        setError(null);
        setResult(null);
        setIsLoading(false);
    }, []);

    return { book, reset, isLoading, error, result };
}
