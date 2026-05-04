"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, RotateCcw, X } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/utils/cn";
import { formatCurrencyDetailed } from "@/utils/format";
import { t } from "@/i18n/he";
import type { FlightOffer } from "@/lib/flightTypes";

export type DepartureBlock = "morning" | "afternoon" | "evening";

export interface FlightFilterState {
    stops: Set<0 | 1 | 2>; // 2 = "2+"
    airlines: Set<string>; // carrier IATA
    priceMax: number; // inclusive
    departureBlocks: Set<DepartureBlock>;
}

export function blockForHour(hour: number): DepartureBlock {
    if (hour >= 5 && hour < 12) return "morning";
    if (hour >= 12 && hour < 18) return "afternoon";
    return "evening"; // 18-04:59
}

export function applyFlightFilters(
    offers: FlightOffer[],
    f: FlightFilterState
): FlightOffer[] {
    return offers.filter((o) => {
        // Stops — clamp 2+
        const stopBucket = (o.stops >= 2 ? 2 : (o.stops as 0 | 1 | 2)) as 0 | 1 | 2;
        if (f.stops.size > 0 && !f.stops.has(stopBucket)) return false;
        // Airlines
        if (f.airlines.size > 0 && !f.airlines.has(o.carrier.iata)) return false;
        // Price
        if (o.price.total > f.priceMax) return false;
        // Departure time block of the FIRST slice
        if (f.departureBlocks.size > 0) {
            const h = new Date(o.slices[0].departureUtc).getUTCHours();
            if (!f.departureBlocks.has(blockForHour(h))) return false;
        }
        return true;
    });
}

interface Props {
    /** All offers BEFORE filtering — used to derive ranges + airline list. */
    sourceOffers: FlightOffer[];
    state: FlightFilterState;
    onChange: (next: FlightFilterState) => void;
    /** Inline (lg sidebar) vs drawer (mobile). Default false = both. */
    className?: string;
}

export function buildInitialFilters(offers: FlightOffer[]): FlightFilterState {
    const max = offers.reduce(
        (m, o) => Math.max(m, o.price.total),
        0
    );
    return {
        stops: new Set<0 | 1 | 2>(),
        airlines: new Set<string>(),
        priceMax: Math.ceil(max || 1) || 1,
        departureBlocks: new Set<DepartureBlock>(),
    };
}

export function activeFilterCount(
    f: FlightFilterState,
    sourceOffers: FlightOffer[]
): number {
    let n = 0;
    n += f.stops.size;
    n += f.airlines.size;
    n += f.departureBlocks.size;
    const initialMax = sourceOffers.reduce(
        (m, o) => Math.max(m, o.price.total),
        0
    );
    if (Math.ceil(initialMax) !== f.priceMax) n += 1;
    return n;
}

/** Inline filter panel — shown in the sidebar on lg+ and inside a drawer on mobile. */
function FiltersPanel({ sourceOffers, state, onChange }: Props) {
    const carriers = useMemo(() => {
        const map = new Map<string, { iata: string; name: string }>();
        for (const o of sourceOffers)
            if (!map.has(o.carrier.iata))
                map.set(o.carrier.iata, { iata: o.carrier.iata, name: o.carrier.name });
        return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [sourceOffers]);

    const priceMin = useMemo(
        () => Math.floor(sourceOffers.reduce((m, o) => Math.min(m, o.price.total), Infinity) || 0),
        [sourceOffers]
    );
    const priceCeil = useMemo(
        () => Math.ceil(sourceOffers.reduce((m, o) => Math.max(m, o.price.total), 0) || 1),
        [sourceOffers]
    );
    const currency = sourceOffers[0]?.price.currency ?? "USD";

    const toggleStop = (s: 0 | 1 | 2) => {
        const next = new Set(state.stops);
        if (next.has(s)) next.delete(s);
        else next.add(s);
        onChange({ ...state, stops: next });
    };

    const toggleAirline = (iata: string) => {
        const next = new Set(state.airlines);
        if (next.has(iata)) next.delete(iata);
        else next.add(iata);
        onChange({ ...state, airlines: next });
    };

    const toggleBlock = (b: DepartureBlock) => {
        const next = new Set(state.departureBlocks);
        if (next.has(b)) next.delete(b);
        else next.add(b);
        onChange({ ...state, departureBlocks: next });
    };

    const reset = () => onChange(buildInitialFilters(sourceOffers));

    const stopOptions: { v: 0 | 1 | 2; label: string }[] = [
        { v: 0, label: t.flights.filters.stop0 },
        { v: 1, label: t.flights.filters.stop1 },
        { v: 2, label: t.flights.filters.stop2plus },
    ];

    const blockOptions: { v: DepartureBlock; label: string }[] = [
        { v: "morning", label: t.flights.filters.morning },
        { v: "afternoon", label: t.flights.filters.afternoon },
        { v: "evening", label: t.flights.filters.evening },
    ];

    return (
        <div className="space-y-5" dir="rtl">
            <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-semibold text-text-primary">
                    {t.flights.filters.title}
                </h3>
                <button
                    type="button"
                    onClick={reset}
                    className="ring-focus inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs text-text-secondary hover:text-text-primary"
                >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {t.flights.filters.reset}
                </button>
            </div>

            {/* Stops */}
            <Section label={t.flights.filters.stops}>
                <div className="flex flex-wrap gap-2">
                    {stopOptions.map((opt) => {
                        const active = state.stops.has(opt.v);
                        return (
                            <button
                                key={opt.v}
                                type="button"
                                onClick={() => toggleStop(opt.v)}
                                className={cn(
                                    "ring-focus inline-flex h-11 items-center rounded-full border px-4 text-sm transition-colors",
                                    active
                                        ? "border-cyan-deep/40 bg-cyan-deep/10 text-cyan-deep dark:border-cyan-jet/40 dark:bg-cyan-jet/10 dark:text-cyan-glow"
                                        : "border-white/10 bg-white/[0.04] text-text-secondary hover:text-text-primary"
                                )}
                            >
                                {opt.label}
                            </button>
                        );
                    })}
                </div>
            </Section>

            {/* Airlines */}
            {carriers.length > 0 && (
                <Section label={t.flights.filters.airlines}>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {carriers.map((c) => {
                            const active = state.airlines.has(c.iata);
                            return (
                                <label
                                    key={c.iata}
                                    className={cn(
                                        "flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border px-3 text-sm transition-colors",
                                        active
                                            ? "border-cyan-deep/40 bg-cyan-deep/10 text-text-primary dark:border-cyan-jet/40 dark:bg-cyan-jet/10"
                                            : "border-white/10 bg-white/[0.04] text-text-secondary hover:text-text-primary"
                                    )}
                                >
                                    <input
                                        type="checkbox"
                                        checked={active}
                                        onChange={() => toggleAirline(c.iata)}
                                        className="h-4 w-4 accent-cyan-deep dark:accent-cyan-jet"
                                    />
                                    <span className="font-mono text-xs text-text-secondary">
                                        {c.iata}
                                    </span>
                                    <span className="truncate">{c.name}</span>
                                </label>
                            );
                        })}
                    </div>
                </Section>
            )}

            {/* Price slider */}
            <Section
                label={t.flights.filters.priceRange}
                value={`≤ ${formatCurrencyDetailed(state.priceMax, currency)}`}
            >
                <input
                    type="range"
                    min={priceMin}
                    max={priceCeil}
                    step={Math.max(1, Math.round((priceCeil - priceMin) / 100))}
                    value={state.priceMax}
                    onChange={(e) =>
                        onChange({ ...state, priceMax: Number(e.target.value) })
                    }
                    className="w-full accent-cyan-deep dark:accent-cyan-jet"
                />
                <div className="mt-1 flex justify-between font-mono text-[10px] text-text-secondary tabular-nums">
                    <span dir="ltr">
                        {formatCurrencyDetailed(priceMin, currency)}
                    </span>
                    <span dir="ltr">
                        {formatCurrencyDetailed(priceCeil, currency)}
                    </span>
                </div>
            </Section>

            {/* Departure time blocks */}
            <Section label={t.flights.filters.departureTime}>
                <div className="grid grid-cols-1 gap-2">
                    {blockOptions.map((opt) => {
                        const active = state.departureBlocks.has(opt.v);
                        return (
                            <button
                                key={opt.v}
                                type="button"
                                onClick={() => toggleBlock(opt.v)}
                                className={cn(
                                    "ring-focus inline-flex h-11 items-center justify-start rounded-xl border px-3 text-sm transition-colors",
                                    active
                                        ? "border-cyan-deep/40 bg-cyan-deep/10 text-cyan-deep dark:border-cyan-jet/40 dark:bg-cyan-jet/10 dark:text-cyan-glow"
                                        : "border-white/10 bg-white/[0.04] text-text-secondary hover:text-text-primary"
                                )}
                            >
                                {opt.label}
                            </button>
                        );
                    })}
                </div>
            </Section>
        </div>
    );
}

function Section({
    label,
    value,
    children,
}: {
    label: string;
    value?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                    {label}
                </p>
                {value && (
                    <p className="font-mono text-xs text-text-primary tabular-nums">
                        {value}
                    </p>
                )}
            </div>
            {children}
        </div>
    );
}

/** Sidebar shell — sticky on lg, drawer on mobile. */
export function FlightFilters(props: Props) {
    const [open, setOpen] = useState(false);
    const count = activeFilterCount(props.state, props.sourceOffers);

    return (
        <>
            {/* Mobile / tablet trigger */}
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="ring-focus lg:hidden inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-text-primary hover:text-text-primary"
            >
                <Filter className="h-4 w-4" />
                {t.flights.filters.openFilters}
                {count > 0 && (
                    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-cyan-deep/20 px-1.5 text-[10px] font-semibold text-cyan-deep dark:bg-cyan-jet/20 dark:text-cyan-glow">
                        {count}
                    </span>
                )}
            </button>

            {/* Desktop sidebar */}
            <aside
                className={cn(
                    "hidden lg:block lg:sticky lg:top-24 lg:self-start",
                    props.className
                )}
            >
                <GlassCard padding="lg" tone="elevated" className="w-full">
                    <FiltersPanel {...props} />
                </GlassCard>
            </aside>

            {/* Mobile drawer */}
            <AnimatePresence>
                {open && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setOpen(false)}
                            className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm lg:hidden"
                        />
                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", stiffness: 320, damping: 32 }}
                            className="fixed inset-y-0 right-0 z-[71] w-[88%] max-w-sm overflow-y-auto bg-bg-base p-5 shadow-2xl lg:hidden"
                            dir="rtl"
                        >
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="font-display text-lg font-semibold">
                                    {t.flights.filters.title}
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    aria-label={t.flights.filters.closeFilters}
                                    className="ring-focus inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <FiltersPanel {...props} />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
