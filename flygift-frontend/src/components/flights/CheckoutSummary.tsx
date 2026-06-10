"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, Pencil, Plane, Wallet, ShieldCheck } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { TextField } from "@/components/ui/FormFields";
import { PrimaryButton, GhostButton } from "@/components/ui/Buttons";
import { formatCurrencyDetailed } from "@/utils/format";
import { cn } from "@/utils/cn";
import { t } from "@/i18n/he";
import type { FlightOffer } from "@/lib/flightTypes";
import type { PassengerDetails } from "./PassengerDetailsStep";

interface Props {
    offer: FlightOffer;
    currentBalance: number;
    isLoading?: boolean;
    /** Primary passenger (first in the manifest) — shown as the contact. */
    passenger: PassengerDetails;
    /** Total passengers in the booking; rendered next to the primary name. */
    passengerCount?: number;
    /**
     * Set by FlightBookingFlow after the backend rejected the booking
     * with `insufficient_balance`. Forces the card-input panel open
     * even when the frontend's optimistic `currentBalance` said the
     * offer was fully covered (can happen when held gift cards are
     * counted toward balance but aren't yet redeemed in the ledger).
     */
    forcePayment?: boolean;
    /** Authoritative remainder reported by the backend on a 400. */
    forcedMissingAmount?: number;
    onConfirm: (input: { passengerName: string; paymentMethodToken?: string }) => void;
    onEditPassenger: () => void;
    onBack: () => void;
}

/**
 * Stage 13 — Checkout summary with split-payment preview.
 * Shows: flight, gift-card discount applied from balance, card-charge
 * for any remainder. Stripe is a placeholder — `pm_test_xxx` tokens
 * succeed, `pm_test_decline` fails (mirrors the backend mock).
 */
export function CheckoutSummary({
    offer,
    currentBalance,
    isLoading,
    passenger,
    passengerCount = 1,
    forcePayment,
    forcedMissingAmount,
    onConfirm,
    onEditPassenger,
    onBack,
}: Props) {
    const optimisticFromBalance = Math.min(currentBalance, offer.price.total);
    const optimisticFromCard = +(offer.price.total - optimisticFromBalance).toFixed(2);

    // When the backend has told us card payment is required, trust its
    // missingAmount over the frontend's optimistic split.
    const fromCard = forcePayment
        ? +(forcedMissingAmount ?? optimisticFromCard).toFixed(2)
        : optimisticFromCard;
    const fromBalance = +(offer.price.total - fromCard).toFixed(2);
    const needsCard = forcePayment || fromCard > 0;

    const passengerName = `${passenger.firstName} ${passenger.lastName}`.trim();

    const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
    const [errors, setErrors] = useState<Record<string, string>>({});

    const token = useMemo(() => {
        if (!needsCard) return undefined;
        const digits = cardNumber.replace(/\s+/g, "");
        if (digits.startsWith("4000")) return "pm_test_decline";
        return "pm_test_visa";
    }, [cardNumber, needsCard]);

    const submit = () => {
        const e: Record<string, string> = {};
        if (needsCard && cardNumber.replace(/\s+/g, "").length < 13)
            e.cardNumber = t.flights.invalidCard;
        setErrors(e);
        if (Object.keys(e).length) return;
        onConfirm({ passengerName, paymentMethodToken: token });
    };

    return (
        <div className="mx-auto max-w-2xl space-y-5 py-6 pb-32" dir="rtl">
            <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <p className="text-[10px] uppercase tracking-[0.25em] text-cyan-jet">
                    {t.flights.finalReview}
                </p>
                <h1 className="font-display text-2xl font-semibold text-gradient-skyline">
                    {t.flights.confirmTrip}
                </h1>
            </motion.div>

            {/* Flight summary */}
            <GlassCard padding="lg" tone="elevated">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-jet/10">
                        <Plane className="h-5 w-5 text-cyan-jet" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm text-text-primary">{offer.carrier.name}</p>
                        <p className="text-xs text-text-secondary">
                            {offer.slices[0].segments[0].flightNumber} · {offer.slices[0].segments[0].aircraft}
                        </p>
                    </div>
                    {offer.slices.length > 1 && (
                        <span className="inline-flex items-center rounded-full border border-cyan-jet/40 bg-cyan-jet/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-cyan-glow">
                            {t.flights.roundTrip}
                        </span>
                    )}
                </div>

                <div className="mt-5 space-y-5">
                    {offer.slices.map((slice, idx) => (
                        <div key={idx} className={cn(idx > 0 && "border-t border-white/10 pt-5")}>
                            <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-cyan-jet">
                                {idx === 0 ? t.flights.outboundLeg : t.flights.returnLeg}
                            </p>
                            <div className="grid grid-cols-3 items-center gap-3">
                                <div>
                                    <p className="font-mono text-xl sm:text-2xl font-semibold tabular-nums">
                                        {new Date(slice.departureUtc).toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            hour12: false,
                                        })}
                                    </p>
                                    <p className="text-xs text-text-secondary">{slice.origin.iata}</p>
                                    <p className="text-xs text-text-secondary truncate">{slice.origin.city}</p>
                                </div>
                                <div className="text-center text-text-secondary">
                                    <Plane className="mx-auto h-4 w-4 -rotate-12 text-cyan-jet" />
                                    <p className="mt-1 text-[10px] uppercase tracking-wider">
                                        {Math.floor(slice.durationMinutes / 60)}h{" "}
                                        {slice.durationMinutes % 60}m
                                    </p>
                                    <p className="text-[10px] uppercase tracking-wider">
                                        {new Date(slice.departureUtc).toLocaleDateString("he-IL", {
                                            day: "2-digit",
                                            month: "short",
                                        })}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="font-mono text-xl sm:text-2xl font-semibold tabular-nums">
                                        {new Date(slice.arrivalUtc).toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            hour12: false,
                                        })}
                                    </p>
                                    <p className="text-xs text-text-secondary">{slice.destination.iata}</p>
                                    <p className="text-xs text-text-secondary truncate">{slice.destination.city}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </GlassCard>

            {/* Passenger summary (read-only — collected in the previous step) */}
            <GlassCard padding="lg" tone="elevated" className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
                        {t.flights.passengerLabel}
                    </h3>
                    <button
                        type="button"
                        onClick={onEditPassenger}
                        className="ring-focus inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs text-text-secondary hover:text-text-primary"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                        {t.flights.editPassenger}
                    </button>
                </div>
                <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-text-secondary">
                            {t.flights.passengerLabel}
                            {passengerCount > 1 && (
                                <span className="ms-2 text-[10px] text-cyan-jet">
                                    +{passengerCount - 1} נוסעים נוספים
                                </span>
                            )}
                        </p>
                        <p className="font-mono tabular-nums" dir="ltr">
                            {passengerName}
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-text-secondary">
                            {t.flights.passportLabel}
                        </p>
                        <p className="font-mono tabular-nums" dir="ltr">
                            {passenger.passportNumber} · {t.flights.passengerStep.passportExpiry}: {passenger.passportExpiry}
                        </p>
                    </div>
                </div>
            </GlassCard>

            {/* Payment breakdown */}
            <GlassCard padding="lg" tone="elevated" className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
                    {t.flights.payment}
                </h3>

                <div className="space-y-2 text-sm">
                    <Row
                        label={t.flights.baseFare}
                        value={formatCurrencyDetailed(offer.price.base, offer.price.currency)}
                    />
                    <Row
                        label={t.flights.taxesFees}
                        value={formatCurrencyDetailed(offer.price.taxes, offer.price.currency)}
                    />
                    <div className="border-t border-white/10" />
                    <Row
                        label={t.flights.total}
                        value={formatCurrencyDetailed(
                            offer.price.total,
                            offer.price.currency
                        )}
                        bold
                    />
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                    <div className="flex items-center gap-3">
                        <Wallet className="h-4 w-4 text-cyan-jet" />
                        <span className="text-sm text-text-primary">{t.flights.giftCardBalance}</span>
                        <span className="ms-auto font-mono text-sm tabular-nums text-success">
                            −{formatCurrencyDetailed(fromBalance, offer.price.currency)}
                        </span>
                    </div>

                    {needsCard ? (
                        <>
                            <div className="flex items-center gap-3">
                                <CreditCard className="h-4 w-4 text-violet-aurora" />
                                <span className="text-sm text-text-primary">{t.flights.cardCharge}</span>
                                <span className="ms-auto font-mono text-sm tabular-nums">
                                    {formatCurrencyDetailed(fromCard, offer.price.currency)}
                                </span>
                            </div>
                            {forcePayment && (
                                <p className="text-xs text-gold-champagne">
                                    {t.flights.paymentMethodRequired}
                                </p>
                            )}
                            <TextField
                                label={t.flights.cardNumber}
                                value={cardNumber}
                                onChange={(e) => setCardNumber(e.target.value)}
                                placeholder="4242 4242 4242 4242"
                                error={errors.cardNumber}
                                hint={t.flights.cardHint}
                            />
                        </>
                    ) : (
                        <p className="text-xs text-success inline-flex items-center gap-1">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            {t.flights.fullyCovered}
                        </p>
                    )}
                </div>
            </GlassCard>

            <div className="flex gap-3">
                <GhostButton type="button" onClick={onBack} disabled={isLoading}>
                    {t.flights.backCta}
                </GhostButton>
                <div className="flex-1">
                    <PrimaryButton
                        type="button"
                        onClick={submit}
                        loading={isLoading}
                        loadingText={t.flights.issuingTicket}
                    >
                        <span className={cn("inline-flex items-center gap-2")}>
                            {t.flights.payAmount(formatCurrencyDetailed(offer.price.total, offer.price.currency))}
                        </span>
                    </PrimaryButton>
                </div>
            </div>
        </div>
    );
}

function Row({
    label,
    value,
    bold,
}: {
    label: string;
    value: string;
    bold?: boolean;
}) {
    return (
        <div className="flex items-center justify-between">
            <span className={cn("text-text-secondary", bold && "text-text-primary")}>
                {label}
            </span>
            <span
                className={cn(
                    "font-mono tabular-nums",
                    bold ? "text-base font-semibold" : "text-sm"
                )}
            >
                {value}
            </span>
        </div>
    );
}
