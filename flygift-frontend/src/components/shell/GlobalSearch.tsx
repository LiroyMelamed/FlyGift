"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Search, Plane, Gift, ArrowRight, X } from "lucide-react";
import { MOCK_TRIPS, searchTrips } from "@/lib/mockTrips";
import { nativeBridge } from "@/utils/nativeBridge";
import type { Trip } from "@/lib/tripTypes";

interface Props {
    open: boolean;
    onClose: () => void;
}

interface Result {
    kind: "trip" | "gift";
    id: string;
    primary: string;
    secondary: string;
    href: string;
}

/** Cmd/Ctrl-K command palette searching trips & gifts via mock data. */
export function GlobalSearch({ open, onClose }: Props) {
    const [q, setQ] = useState("");
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) {
            setQ("");
            // focus next tick so motion has mounted the input
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    // ESC to close
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    const results = useMemo<Result[]>(() => {
        if (!q.trim()) return [];
        const all = [...MOCK_TRIPS.upcoming, ...MOCK_TRIPS.past];
        const trips: Result[] = searchTrips(all, q).slice(0, 8).map((t: Trip) => ({
            kind: "trip",
            id: `trip-${t.bookingId}`,
            primary: `${t.origin} → ${t.destination} · ${t.flightNumber}`,
            secondary: `${t.originCity} to ${t.destinationCity} · Ref ${t.bookingReference ?? "—"}`,
            href: `/bookings/mine?focus=${t.bookingId}`,
        }));
        return trips;
    }, [q]);

    const go = (href: string) => {
        nativeBridge.haptic("light");
        onClose();
        router.push(href);
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 z-50 flex items-start justify-center bg-bg-base/70 backdrop-blur-md p-4 pt-[12vh]"
                >
                    <motion.div
                        initial={{ y: -16, opacity: 0, scale: 0.98 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: -8, opacity: 0, scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 320, damping: 28 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-xl rounded-2xl border border-white/10 bg-bg-elevated/90 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl overflow-hidden"
                    >
                        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
                            <Search className="h-4 w-4 text-text-secondary" />
                            <input
                                ref={inputRef}
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="Search bookings by ID, destination, flight…"
                                className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none"
                            />
                            <kbd className="hidden sm:inline-flex items-center rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-text-secondary">
                                ESC
                            </kbd>
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-full p-1 text-text-secondary hover:text-text-primary hover:bg-white/5 sm:hidden"
                                aria-label="Close"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto py-2">
                            {!q.trim() ? (
                                <div className="px-4 py-6 text-center text-xs text-text-secondary">
                                    Try a destination (CDG), flight (AF221), or booking ref.
                                </div>
                            ) : results.length === 0 ? (
                                <div className="px-4 py-6 text-center text-xs text-text-secondary">
                                    No matches for &ldquo;{q}&rdquo;.
                                </div>
                            ) : (
                                <ul className="space-y-0.5 px-2">
                                    {results.map((r) => (
                                        <li key={r.id}>
                                            <button
                                                type="button"
                                                onClick={() => go(r.href)}
                                                className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/[0.04] focus:bg-white/[0.06] focus:outline-none"
                                            >
                                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-jet/10 text-cyan-jet">
                                                    {r.kind === "trip" ? (
                                                        <Plane className="h-4 w-4" />
                                                    ) : (
                                                        <Gift className="h-4 w-4" />
                                                    )}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-semibold text-text-primary">
                                                        {r.primary}
                                                    </p>
                                                    <p className="truncate text-xs text-text-secondary">
                                                        {r.secondary}
                                                    </p>
                                                </div>
                                                <ArrowRight className="h-3.5 w-3.5 text-text-secondary opacity-0 transition-opacity group-hover:opacity-100" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
