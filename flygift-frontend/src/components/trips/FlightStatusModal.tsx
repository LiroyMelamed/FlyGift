"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, Activity, Plane } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { FlightStatusBadge } from "./FlightStatusBadge";
import { t } from "@/i18n/he";
import type { Trip } from "@/lib/tripTypes";

interface Props {
    trip: Trip | null;
    onClose: () => void;
}

const fmt = (iso?: string) =>
    iso
        ? new Date(iso).toLocaleString([], {
            weekday: "long",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
        : "—";

export function FlightStatusModal({ trip, onClose }: Props) {
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
                        initial={{ scale: 0.95, y: 16 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 16 }}
                        className="w-full max-w-md"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <GlassCard padding="lg" tone="elevated" className="space-y-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-cyan-jet" />
                                    <h2 className="font-display text-lg font-semibold">
                                        {t.flights.status}
                                    </h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="rounded-full p-1 text-text-secondary hover:bg-white/10"
                                    aria-label={t.trips.cell.close}
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="font-mono text-xl font-semibold">
                                        {trip.origin} → {trip.destination}
                                    </p>
                                    <p className="text-xs text-text-secondary">
                                        {trip.flightNumber} · {trip.carrier}
                                    </p>
                                </div>
                                <FlightStatusBadge status={trip.flightStatus} />
                            </div>

                            <div className="grid grid-cols-2 gap-3 rounded-xl bg-white/[0.03] p-3 text-sm">
                                <Cell label={t.flights.depart2} value={fmt(trip.departureUtc)} />
                                <Cell label={t.flights.gate} value={trip.gate ?? "—"} />
                                <Cell label={t.flights.seat} value={trip.seat ?? "—"} />
                                <Cell label={t.trips.cell.ref} value={trip.bookingReference ?? "—"} />
                            </div>

                            <p className="text-xs text-text-secondary leading-relaxed">
                                {t.trips.statusHint}
                            </p>

                            <div className="flex items-center gap-2 text-xs text-text-secondary">
                                <Plane className="h-3.5 w-3.5 text-cyan-jet" />
                                <span>{trip.originCity} → {trip.destinationCity}</span>
                            </div>
                        </GlassCard>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function Cell({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-text-secondary">{label}</p>
            <p className="mt-0.5 font-medium text-text-primary break-words">{value}</p>
        </div>
    );
}
