"use client";

import { motion } from "framer-motion";
import { Plane, Wallet, QrCode, Activity } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GhostButton } from "@/components/ui/Buttons";
import { FlightStatusBadge } from "./FlightStatusBadge";
import { formatCurrencyDetailed } from "@/utils/format";
import { nativeBridge } from "@/utils/nativeBridge";
import type { Trip } from "@/lib/tripTypes";

interface Props {
    trip: Trip;
    index?: number;
    onShowBoardingPass: (t: Trip) => void;
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

const apiBase =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE_URL) || "";

export function TripCard({ trip, index = 0, onShowBoardingPass }: Props) {
    const handleAppleWallet = () => {
        nativeBridge.haptic("light");
        nativeBridge.openWallet({
            type: "apple",
            url: `${apiBase}/api/Bookings/${trip.bookingId}/wallet-pass`,
        });
    };

    const handleGoogleWallet = async () => {
        nativeBridge.haptic("light");
        // In prod: GET /api/Bookings/{id}/wallet-link/google → { url }
        nativeBridge.openWallet({
            type: "google",
            url: `${apiBase}/api/Bookings/${trip.bookingId}/wallet-link/google`,
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="relative"
        >
            {/* Timeline dot */}
            <span
                aria-hidden
                className="absolute -left-[27px] top-6 hidden h-3 w-3 rounded-full bg-cyan-jet shadow-glow-cyan ring-4 ring-bg-base sm:block"
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
                <div className="grid grid-cols-4 gap-2 rounded-xl bg-white/[0.03] p-3 text-xs">
                    <Cell label="Gate" value={trip.gate ?? "—"} />
                    <Cell label="Seat" value={trip.seat ?? "—"} />
                    <Cell label="Ref" value={trip.bookingReference ?? "—"} mono />
                    <Cell
                        label="Paid"
                        value={
                            trip.totalCharged != null
                                ? formatCurrencyDetailed(trip.totalCharged, "USD")
                                : "—"
                        }
                    />
                </div>

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
                            Boarding Pass
                        </GhostButton>
                        <GhostButton
                            type="button"
                            onClick={handleAppleWallet}
                            className="!h-10 !px-3 text-xs"
                        >
                            <Wallet className="h-3.5 w-3.5" />
                            Apple Wallet
                        </GhostButton>
                        <GhostButton
                            type="button"
                            onClick={handleGoogleWallet}
                            className="!h-10 !px-3 text-xs"
                        >
                            <Wallet className="h-3.5 w-3.5" />
                            Google Wallet
                        </GhostButton>
                        <GhostButton
                            type="button"
                            onClick={() => nativeBridge.haptic("light")}
                            className="!h-10 !px-3 text-xs"
                        >
                            <Activity className="h-3.5 w-3.5" />
                            Status
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
