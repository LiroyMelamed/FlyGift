"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, Plane } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { t } from "@/i18n/he";
import type { Trip } from "@/lib/tripTypes";

interface Props {
    trip: Trip | null;
    onClose: () => void;
}

const fmt = (iso?: string) =>
    iso
        ? new Date(iso).toLocaleString([], {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
        : "—";

/** Boarding-pass modal — full-screen reveal with QR-style barcode strip. */
export function BoardingPassModal({ trip, onClose }: Props) {
    return (
        <AnimatePresence>
            {trip && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/70 backdrop-blur-md p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 20 }}
                        transition={{ type: "spring", stiffness: 240, damping: 24 }}
                        className="w-full max-w-md"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <GlassCard padding="none" tone="elevated" glow="cyan" className="overflow-hidden">
                            <div className="flex items-center justify-between bg-skyline-gradient px-5 py-3">
                                <div className="flex items-center gap-2 text-white">
                                    <Plane className="h-4 w-4" />
                                    <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                                        {t.flights.boardingPass}
                                    </span>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="rounded-full p-1 text-white/80 hover:bg-white/15"
                                    aria-label={t.trips.cell.close}
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="bg-gradient-to-br from-cyan-jet/15 via-transparent to-violet-aurora/10 p-5 space-y-5">
                                <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <p className="font-mono text-3xl font-semibold tracking-wider tabular-nums">
                                            {trip.origin}
                                        </p>
                                        <p className="text-xs text-text-secondary">{trip.originCity}</p>
                                    </div>
                                    <Plane className="h-4 w-4 -rotate-12 text-cyan-jet" />
                                    <div className="flex-1 text-right">
                                        <p className="font-mono text-3xl font-semibold tracking-wider tabular-nums">
                                            {trip.destination}
                                        </p>
                                        <p className="text-xs text-text-secondary">{trip.destinationCity}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3 text-xs">
                                    <Cell label={t.flights.passengerLabel} value="—" />
                                    <Cell label={t.flights.flight} value={trip.flightNumber} mono />
                                    <Cell label={t.trips.cell.cabinClass} value={t.trips.cell.cabinEconomy} />
                                    <Cell label={t.flights.gate} value={trip.gate ?? "—"} mono />
                                    <Cell label={t.flights.seat} value={trip.seat ?? "—"} mono />
                                    <Cell label={t.trips.cell.terminal} value={trip.terminal ?? "—"} />
                                    <Cell label={t.flights.depart2} value={fmt(trip.departureUtc)} />
                                    <Cell label={t.trips.cell.arrive} value={fmt(trip.arrivalUtc)} />
                                    <Cell label={t.trips.cell.ref} value={trip.bookingReference ?? "—"} mono />
                                </div>
                            </div>

                            {/* punched perforation */}
                            <div className="relative h-10 bg-bg-base/50">
                                <div className="absolute -left-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-bg-base" />
                                <div className="absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-bg-base" />
                                <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 border-t border-dashed border-white/15" />
                            </div>

                            <div className="bg-white p-4">
                                {/* Pseudo-QR */}
                                <div className="mx-auto h-32 w-32 grid grid-cols-8 gap-0.5 bg-white">
                                    {Array.from({ length: 64 }).map((_, i) => {
                                        const seed = (trip.bookingId * 37 + i * 17) % 100;
                                        return (
                                            <div
                                                key={i}
                                                className={seed < 55 ? "bg-black" : "bg-white"}
                                            />
                                        );
                                    })}
                                </div>
                                <p className="mt-2 text-center font-mono text-[10px] tracking-wider text-black/70">
                                    {trip.bookingReference} · {trip.flightNumber}
                                </p>
                            </div>
                        </GlassCard>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function Cell({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div>
            <p className="text-[9px] uppercase tracking-wider text-text-secondary">{label}</p>
            <p
                className={`mt-0.5 text-sm font-semibold text-text-primary truncate ${mono ? "font-mono tabular-nums" : ""
                    }`}
            >
                {value}
            </p>
        </div>
    );
}
