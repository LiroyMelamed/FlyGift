"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, Plane, Sparkles } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { TripCard } from "./TripCard";
import { BoardingPassModal } from "./BoardingPassModal";
import { TransactionHistoryView } from "./TransactionHistoryView";
import { MOCK_TRIPS, searchTrips } from "@/lib/mockTrips";
import { formatCurrencyDetailed } from "@/utils/format";
import { t } from "@/i18n/he";
import type { Trip } from "@/lib/tripTypes";

/**
 * Stage 14 — Travel Hub. Renders an upcoming/past timeline; replace
 * MOCK_TRIPS with `ApiUtils.get('Bookings/MyTrips').startRequest()`
 * once the backend is reachable — payload shape matches.
 */
export function MyTripsView() {
    const [tab, setTab] = useState<"upcoming" | "past" | "ledger">("upcoming");
    const [q, setQ] = useState("");
    const [pass, setPass] = useState<Trip | null>(null);

    const all = MOCK_TRIPS;
    const list = useMemo(
        () =>
            tab === "ledger"
                ? []
                : searchTrips(tab === "upcoming" ? all.upcoming : all.past, q),
        [tab, q, all]
    );

    return (
        <div className="space-y-6 py-6" dir="rtl">
            {/* Hero */}
            <motion.header
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-1"
            >
                <p className="text-[10px] uppercase tracking-[0.25em] text-cyan-jet">
                    {t.trips.kicker}
                </p>
                <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
                    <span className="text-gradient-skyline">{t.trips.title}</span>
                </h1>
            </motion.header>

            {/* Wallet snapshot */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
            >
                <GlassCard padding="lg" glow="cyan" className="relative">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-text-secondary">
                                {t.trips.availableBalance}
                            </p>
                            <p className="mt-2 font-mono text-3xl font-semibold tabular-nums">
                                {formatCurrencyDetailed(
                                    all.wallet.totalActiveBalance,
                                    all.wallet.currency
                                )}
                            </p>
                            <p className="mt-1 text-xs text-text-secondary">
                                {t.trips.across(all.wallet.activeGiftCount)}
                            </p>
                        </div>
                        <div className="hidden sm:flex flex-col items-end text-right">
                            <span className="inline-flex items-center gap-1 rounded-full border border-gold-champagne/40 bg-gold-champagne/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold-champagne">
                                <Sparkles className="h-3 w-3" /> {t.trips.premium}
                            </span>
                            <p className="mt-2 text-xs text-text-secondary">
                                {t.trips.upcomingPastSummary(all.upcoming.length, all.past.length)}
                            </p>
                        </div>
                    </div>
                </GlassCard>
            </motion.div>

            {/* Tabs + search */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1">
                    {(["upcoming", "past", "ledger"] as const).map((k) => (
                        <button
                            key={k}
                            type="button"
                            onClick={() => setTab(k)}
                            className={`relative px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors rounded-full ${tab === k
                                ? "text-bg-base"
                                : "text-text-secondary hover:text-text-primary"
                                }`}
                        >
                            {tab === k && (
                                <motion.span
                                    layoutId="trips-tab"
                                    className="absolute inset-0 rounded-full bg-champagne-gradient"
                                    transition={{ type: "spring", stiffness: 320, damping: 28 }}
                                />
                            )}
                            <span className="relative">
                                {k === "upcoming"
                                    ? t.trips.tabs.upcoming(all.upcoming.length)
                                    : k === "past"
                                        ? t.trips.tabs.past(all.past.length)
                                        : t.trips.tabs.ledger}
                            </span>
                        </button>
                    ))}
                </div>
                {tab !== "ledger" && (
                    <div className="relative w-full sm:w-72">
                        <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder={t.trips.searchPlaceholder}
                            className="w-full rounded-full border border-white/10 bg-white/[0.04] pr-9 pl-4 py-2 text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-cyan-jet/60 focus:bg-white/[0.06] focus:shadow-[0_0_0_4px_rgba(0,229,255,0.08)]"
                        />
                    </div>
                )}
            </div>

            {/* Timeline or Ledger */}
            {tab === "ledger" ? (
                <TransactionHistoryView />
            ) : (
                <div className="relative sm:pr-8">
                    {/* vertical line */}
                    <span
                        aria-hidden
                        className="absolute right-0 top-2 bottom-2 hidden w-px bg-gradient-to-b from-cyan-jet/40 via-violet-aurora/20 to-transparent sm:block"
                    />
                    {list.length === 0 ? (
                        <GlassCard padding="lg" className="text-center text-text-secondary">
                            <Plane className="mx-auto h-6 w-6 text-text-secondary/60" />
                            <p className="mt-2 text-sm">{t.trips.empty(tab)}</p>
                        </GlassCard>
                    ) : (
                        <div className="space-y-4">
                            {list.map((tr, i) => (
                                <TripCard
                                    key={tr.bookingId}
                                    trip={tr}
                                    index={i}
                                    onShowBoardingPass={setPass}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            <BoardingPassModal trip={pass} onClose={() => setPass(null)} />
        </div>
    );
}
