"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plane, Wallet, QrCode, Activity } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GhostButton } from "@/components/ui/Buttons";
import { FlightStatusBadge } from "./FlightStatusBadge";
import { formatCurrencyDetailed } from "@/utils/format";
import { nativeBridge } from "@/utils/nativeBridge";
import { openAppleWalletPass, openGoogleWalletPass } from "@/utils/walletPass";
import { t } from "@/i18n/he";
import type { Trip } from "@/lib/tripTypes";

interface Props {
    trip: Trip;
    index?: number;
    onShowBoardingPass: (t: Trip) => void;
    onShowStatus: (t: Trip) => void;
}

const fmtTime = (iso?: string) =>
    iso
        ? new Date(iso).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        })
        : "—";

const fmtDate = (iso?: string) =>
    iso
        ? new Date(iso).toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
        })
        : "—";

export function TripCard({ trip, index = 0, onShowBoardingPass, onShowStatus }: Props) {
    const [walletError, setWalletError] = useState<string | null>(null);
    const [walletLoading, setWalletLoading] = useState<"apple" | "google" | null>(null);

    const handleAppleWallet = async () => {
        nativeBridge.haptic("light");
        setWalletError(null);
        setWalletLoading("apple");
        try {
            await openAppleWalletPass(trip.bookingId);
        } catch (e) {
            setWalletError(e instanceof Error ? e.message : t.trips.walletFailed);
        } finally {
            setWalletLoading(null);
        }
    };

    const handleGoogleWallet = async () => {
        nativeBridge.haptic("light");
        setWalletError(null);
        setWalletLoading("google");
        try {
            await openGoogleWalletPass(trip.bookingId);
        } catch (e) {
            setWalletError(e instanceof Error ? e.message : t.trips.walletFailed);
        } finally {
            setWalletLoading(null);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="relative"
        >
            {/* Timeline dot — inline-start side (right in RTL) */}
            <span
                aria-hidden
                className="absolute -start-[27px] top-6 hidden h-3 w-3 rounded-full bg-cyan-jet shadow-glow-cyan ring-4 ring-bg-base sm:block"
            />

            <GlassCard padding="md" tone="elevated" interactive className="space-y-4">
                {/* Top row: route + status */}
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2 text-xs text-text-secondary">
                            <span>{fmtDate(trip.departureUtc)}</span>
                            <span>·</span>
                            <span>{trip.carrier}</span>
                            <span>·</span>
                            <span className="font-mono">{trip.flightNumber}</span>
                        </div>
                        <div className="mt-2 flex items-center gap-3">
                            <span className="font-mono text-2xl font-semibold tabular-nums">
                                {trip.origin}
                            </span>
                            <Plane className="h-4 w-4 -rotate-12 text-cyan-jet" />
                            <span className="font-mono text-2xl font-semibold tabular-nums">
                                {trip.destination}
                            </span>
                        </div>
                        <p className="mt-0.5 text-xs text-text-secondary">
                            {trip.originCity} → {trip.destinationCity}
                        </p>
                    </div>
                    <div className="text-right space-y-1">
                        <FlightStatusBadge status={trip.flightStatus} />
                        <p className="font-mono text-lg font-semibold tabular-nums">
                            {fmtTime(trip.departureUtc)}
                        </p>
                    </div>
                </div>

                {/* Mid: gate / seat / ref / total */}
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-white/[0.03] p-3 text-xs sm:grid-cols-4">
                    <Cell label={t.flights.gate} value={trip.gate ?? "—"} />
                    <Cell label={t.flights.seat} value={trip.seat ?? "—"} />
                    <Cell label={t.trips.cell.ref} value={trip.bookingReference ?? "—"} mono />
                    <Cell
                        label={t.trips.cell.paid}
                        value={
                            trip.totalCharged != null
                                ? formatCurrencyDetailed(
                                    trip.totalCharged,
                                    trip.currency ?? "ILS"
                                )
                                : "—"
                        }
                    />
                </div>

                {walletError && (
                    <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                        {walletError}
                    </p>
                )}

                {/* Actions */}
                {trip.isUpcoming && (
                    <div className="flex flex-wrap gap-2">
                        <GhostButton
                            type="button"
                            onClick={() => {
                                nativeBridge.haptic("light");
                                onShowBoardingPass(trip);
                            }}
                            className="!h-10 !px-3 text-xs"
                        >
                            <QrCode className="h-3.5 w-3.5" />
                            {t.flights.boardingPass}
                        </GhostButton>
                        <GhostButton
                            type="button"
                            onClick={handleAppleWallet}
                            disabled={walletLoading !== null}
                            className="!h-10 !px-3 text-xs"
                        >
                            <Wallet className="h-3.5 w-3.5" />
                            {walletLoading === "apple" ? t.common.loading : t.trips.cell.appleWallet}
                        </GhostButton>
                        <GhostButton
                            type="button"
                            onClick={handleGoogleWallet}
                            disabled={walletLoading !== null}
                            className="!h-10 !px-3 text-xs"
                        >
                            <Wallet className="h-3.5 w-3.5" />
                            {walletLoading === "google" ? t.common.loading : t.trips.cell.googleWallet}
                        </GhostButton>
                        <GhostButton
                            type="button"
                            onClick={() => {
                                nativeBridge.haptic("light");
                                onShowStatus(trip);
                            }}
                            className="!h-10 !px-3 text-xs"
                        >
                            <Activity className="h-3.5 w-3.5" />
                            {t.flights.status}
                        </GhostButton>
                    </div>
                )}
            </GlassCard>
        </motion.div>
    );
}

function Cell({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div>
            <p className="text-[9px] uppercase tracking-wider text-text-secondary">
                {label}
            </p>
            <p
                className={`mt-0.5 text-sm font-semibold text-text-primary ${mono ? "font-mono tabular-nums" : ""
                    }`}
            >
                {value}
            </p>
        </div>
    );
}
