"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Search, Plane, Gift, ArrowRight, X } from "lucide-react";
import { useAppDerived } from "@/lib/appStore";
import { nativeBridge } from "@/utils/nativeBridge";
import { t } from "@/i18n/he";
import type { Trip } from "@/lib/tripTypes";
import type { MockGiftCard } from "@/lib/mockData";

function searchTrips(all: Trip[], q: string): Trip[] {
    const term = q.trim().toLowerCase();
    if (!term) return all;
    return all.filter(
        (tr) =>
            String(tr.bookingId).includes(term) ||
            tr.bookingReference?.toLowerCase().includes(term) ||
            tr.destination.toLowerCase().includes(term) ||
            tr.destinationCity.toLowerCase().includes(term) ||
            tr.origin.toLowerCase().includes(term) ||
            tr.originCity.toLowerCase().includes(term) ||
            tr.flightNumber.toLowerCase().includes(term)
    );
}

function searchCards(all: MockGiftCard[], q: string): MockGiftCard[] {
    const term = q.trim().toLowerCase();
    if (!term) return all;
    return all.filter(
        (c) =>
            c.id.toLowerCase().includes(term) ||
            c.code.toLowerCase().includes(term) ||
            c.senderName.toLowerCase().includes(term) ||
            c.recipientName.toLowerCase().includes(term) ||
            c.category.toLowerCase().includes(term) ||
            String(c.amount).includes(term)
    );
}

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
    const { bookings, cards } = useAppDerived();

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
        const trips: Result[] = searchTrips(bookings, q).slice(0, 6).map((tr: Trip) => ({
            kind: "trip",
            id: `trip-${tr.bookingId}`,
            primary: `${tr.origin} → ${tr.destination} · ${tr.flightNumber}`,
            secondary: `${tr.originCity} → ${tr.destinationCity} · ${tr.bookingReference ?? "—"}`,
            href: `/bookings/mine?focus=${tr.bookingId}`,
        }));
        const gifts: Result[] = searchCards(cards, q).slice(0, 6).map((c) => ({
            kind: "gift",
            id: `gift-${c.id}`,
            primary: `${c.code} · ${c.amount.toLocaleString()} ${c.currency}`,
            secondary: `${c.senderName} → ${c.recipientName}`,
            href: `/gifts/${c.code}`,
        }));
        return [...trips, ...gifts];
    }, [q, bookings, cards]);

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
                        dir="rtl"
                        className="w-full max-w-xl rounded-2xl border border-white/10 bg-bg-elevated/90 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl overflow-hidden"
                    >
                        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
                            <Search className="h-4 w-4 text-text-secondary" />
                            <input
                                ref={inputRef}
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder={t.search.placeholder}
                                className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none"
                            />
                            <kbd className="hidden sm:inline-flex items-center rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-text-secondary">
                                ESC
                            </kbd>
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-full p-1 text-text-secondary hover:text-text-primary hover:bg-white/5 sm:hidden"
                                aria-label={t.search.close}
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto py-2">
                            {!q.trim() ? (
                                <div className="px-4 py-6 text-center text-xs text-text-secondary">
                                    {t.search.hint}
                                </div>
                            ) : results.length === 0 ? (
                                <div className="px-4 py-6 text-center text-xs text-text-secondary">
                                    {t.search.noMatches(q)}
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
