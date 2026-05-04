"use client";

import { useState, useCallback } from "react";
import type { BookFlightRequest, BookFlightResult } from "@/lib/flightTypes";

/**
 * Stage 13 — Book a selected flight.
 *
 * Wired to mock for offline mode. Replace with:
 *   ApiUtils.post("Bookings/BookFlight", req).startRequest()
 * with an Idempotency-Key header (use crypto.randomUUID per attempt) once
 * the backend is reachable.
 */
export function useBookFlight() {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<BookFlightResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const book = useCallback(
        async (req: BookFlightRequest, opts: {
            offerTotal: number;
            currency: string;
            currentBalance: number;
            route: string;
            flightNumber: string;
            departureUtc: string;
        }) => {
            setIsLoading(true);
            setError(null);
            try {
                // Mock the split-payment math the backend does, so the success
                // screen looks identical when wired live.
                await new Promise((r) => setTimeout(r, 1400));

                if (
                    req.paymentMethodToken?.toLowerCase().startsWith("pm_test_decline")
                ) {
                    throw new Error("Card declined.");
                }

                const fromBalance = Math.min(opts.currentBalance, opts.offerTotal);
                const fromCard = +(opts.offerTotal - fromBalance).toFixed(2);

                if (fromCard > 0 && !req.paymentMethodToken) {
                    throw new Error(
                        `Insufficient balance. Add a card to cover the remaining $${fromCard.toFixed(
                            2
                        )}.`
                    );
                }

                const out: BookFlightResult = {
                    bookingId: Math.floor(Math.random() * 90_000) + 10_000,
                    flightNumber: opts.flightNumber,
                    route: opts.route,
                    departureUtc: opts.departureUtc,
                    seat: `${Math.floor(Math.random() * 38) + 1}${"ABCDEF"[Math.floor(Math.random() * 6)]
                        }`,
                    gate: `${"ABCDEF"[Math.floor(Math.random() * 6)]}${Math.floor(Math.random() * 30) + 1
                        }`,
                    totalCharged: opts.offerTotal,
                    paidFromBalance: fromBalance,
                    paidFromCard: fromCard,
                    currency: opts.currency,
                    remainingBalance: +(opts.currentBalance - fromBalance).toFixed(2),
                    cardBrand: fromCard > 0 ? "visa" : null,
                    cardLast4: fromCard > 0 ? "4242" : null,
                };
                setResult(out);
                return out;
            } catch (e) {
                const msg = e instanceof Error ? e.message : "Booking failed.";
                setError(msg);
                throw e;
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
