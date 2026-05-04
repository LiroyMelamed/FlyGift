"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import {
    Plane,
    Hotel,
    Search,
    MapPin,
    Calendar,
    ArrowLeft,
    Sparkles,
    LogIn,
} from "lucide-react";
import { t } from "@/i18n/he";
import { cn } from "@/utils/cn";
import {
    searchAirportsApi,
    findAirportApi,
    type GlobalAirport,
} from "@/lib/airportsApi";

const FALLBACK_AIRPORT: GlobalAirport = {
    iata: "TLV",
    name: "Ben Gurion",
    city: "Tel Aviv",
    cityHe: "תל אביב",
    country: "Israel",
    countryHe: "ישראל",
};

type Tab = "flights" | "hotels";

interface PreviewResult {
    title: string;
    subtitle: string;
    price: string;
    badge?: string;
}

const FLIGHT_PREVIEW: PreviewResult[] = [
    { title: "TLV → JFK", subtitle: "אל על · מסלול ישיר · 11ש' 45ד'", price: "₪3,490", badge: "מומלץ" },
    { title: "TLV → CDG", subtitle: "Air France · עצירה אחת · 7ש' 10ד'", price: "₪1,890" },
    { title: "TLV → BCN", subtitle: "Vueling · ישיר · 4ש' 50ד'", price: "₪1,240" },
];

const HOTEL_PREVIEW: PreviewResult[] = [
    { title: "The Skyline Grand", subtitle: "מנהטן · ★ 4.8 · 1,240 ביקורות", price: "$320", badge: "פופולרי" },
    { title: "Le Marais Boutique", subtitle: "פריז · ★ 4.7 · 980 ביקורות", price: "$245" },
    { title: "Costa Azul Resort", subtitle: "ברצלונה · ★ 4.6 · 2,140 ביקורות", price: "$190" },
];

export function StorySearch() {
    const ref = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "end start"],
    });
    const y = useTransform(scrollYProgress, [0, 1], ["6%", "-6%"]);

    const [tab, setTab] = useState<Tab>("flights");
    const [searched, setSearched] = useState(false);
    const [tripType, setTripType] = useState<"oneWay" | "roundTrip">("roundTrip");
    const results = tab === "flights" ? FLIGHT_PREVIEW : HOTEL_PREVIEW;

    return (
        <section
            ref={ref}
            className="relative min-h-[100svh] overflow-hidden py-24"
            dir="rtl"
        >
            {/* Soft accent wash; global stars/clouds bleed through. */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10"
                style={{
                    background:
                        "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(14,165,233,0.10) 0%, transparent 60%)",
                }}
            />

            <motion.div
                style={{ y }}
                className="mx-auto w-full max-w-screen-xl space-y-10 px-6"
            >
                <header className="space-y-3 text-center">
                    <span className="inline-flex items-center gap-2 rounded-full border border-cyan-deep/30 bg-cyan-deep/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-cyan-deep backdrop-blur-md dark:border-cyan-jet/40 dark:bg-cyan-jet/10 dark:text-cyan-glow">
                        <Sparkles className="h-3 w-3" />
                        {t.landing.story2.kicker}
                    </span>
                    <h2 className="font-display text-4xl font-semibold leading-tight tracking-tight text-text-primary sm:text-5xl">
                        {t.landing.story2.title}
                    </h2>
                    <p className="mx-auto max-w-2xl text-base text-text-secondary sm:text-lg">
                        {t.landing.story2.body}
                    </p>
                </header>

                {/* Glass card */}
                <div className="rounded-[2rem] border border-border-glass bg-bg-glass p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:p-8">
                    {/* Tabs */}
                    <div className="mb-6 flex items-center justify-center">
                        <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1">
                            <TabButton
                                active={tab === "flights"}
                                onClick={() => {
                                    setTab("flights");
                                    setSearched(false);
                                }}
                                icon={Plane}
                            >
                                {t.landing.story2.tabFlights}
                            </TabButton>
                            <TabButton
                                active={tab === "hotels"}
                                onClick={() => {
                                    setTab("hotels");
                                    setSearched(false);
                                }}
                                icon={Hotel}
                            >
                                {t.landing.story2.tabHotels}
                            </TabButton>
                        </div>
                    </div>

                    {/* Trip-type toggle (flights only) */}
                    {tab === "flights" && (
                        <div className="mb-4 flex items-center justify-center">
                            <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTripType("oneWay");
                                        setSearched(false);
                                    }}
                                    className={cn(
                                        "inline-flex h-8 items-center rounded-full px-4 text-xs font-medium transition-all",
                                        tripType === "oneWay"
                                            ? "bg-cyan-jet/20 text-cyan-glow border border-cyan-jet/40"
                                            : "text-text-secondary hover:text-text-primary"
                                    )}
                                >
                                    {t.landing.story2.oneWay}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTripType("roundTrip");
                                        setSearched(false);
                                    }}
                                    className={cn(
                                        "inline-flex h-8 items-center rounded-full px-4 text-xs font-medium transition-all",
                                        tripType === "roundTrip"
                                            ? "bg-cyan-jet/20 text-cyan-glow border border-cyan-jet/40"
                                            : "text-text-secondary hover:text-text-primary"
                                    )}
                                >
                                    {t.landing.story2.roundTrip}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Form */}
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        {tab === "flights" ? (
                            <>
                                <CityField label={t.landing.story2.from} initial="TLV" />
                                <CityField label={t.landing.story2.to} initial="JFK" />
                                <Field icon={Calendar} label={t.landing.story2.depart} type="date" defaultValue="2026-06-12" />
                                {tripType === "roundTrip" && (
                                    <Field icon={Calendar} label={t.landing.story2.returnDate} type="date" defaultValue="2026-06-19" />
                                )}
                            </>
                        ) : (
                            <>
                                <CityField label={t.landing.story2.city} initial="CDG" />
                                <Field icon={Calendar} label={t.landing.story2.checkIn} type="date" defaultValue="2026-06-12" />
                                <Field icon={Calendar} label={t.landing.story2.checkOut} type="date" defaultValue="2026-06-15" />
                            </>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => setSearched(true)}
                        className="btn-gold mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold"
                    >
                        <Search className="h-4 w-4" />
                        {t.landing.story2.search}
                    </button>

                    {/* Results */}
                    <AnimatePresence>
                        {searched && (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 8 }}
                                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                                className="mt-6 space-y-3"
                            >
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-text-secondary">
                                        {t.landing.story2.previewResults}
                                    </p>
                                    <span className="inline-flex items-center gap-1 rounded-full border border-cyan-jet/30 bg-cyan-jet/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-glow">
                                        <Sparkles className="h-3 w-3" />
                                        {t.landing.story2.previewBadge}
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    {results.map((r, i) => (
                                        <ResultRow key={r.title} result={r} index={i} tab={tab} />
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </section>
    );
}

function TabButton({
    active,
    onClick,
    icon: Icon,
    children,
}: {
    active: boolean;
    onClick: () => void;
    icon: React.ComponentType<{ className?: string }>;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition-all",
                active
                    ? "bg-cyan-jet/20 text-cyan-glow border border-cyan-jet/40 shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
            )}
        >
            <Icon className="h-4 w-4" />
            {children}
        </button>
    );
}

function Field({
    icon: Icon,
    label,
    defaultValue,
    type = "text",
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    defaultValue?: string;
    type?: string;
}) {
    return (
        <label className="block space-y-1.5">
            <span className="block text-[11px] font-medium uppercase tracking-wider text-text-secondary">
                {label}
            </span>
            <span className="relative block">
                <Icon className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-glow" />
                <input
                    type={type}
                    defaultValue={defaultValue}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 pr-10 text-sm text-text-primary placeholder:text-text-secondary/60 transition-colors focus:border-cyan-jet/60 focus:bg-white/[0.06] focus:outline-none focus:shadow-[0_0_0_4px_rgba(14,165,233,0.12)]"
                />
            </span>
        </label>
    );
}

function CityField({ label, initial }: { label: string; initial?: string }) {
    const [selected, setSelected] = useState<GlobalAirport>(FALLBACK_AIRPORT);
    const [query, setQuery] = useState(
        `${FALLBACK_AIRPORT.iata} — ${FALLBACK_AIRPORT.cityHe}`
    );
    const [open, setOpen] = useState(false);
    const [highlight, setHighlight] = useState(0);
    const [matches, setMatches] = useState<GlobalAirport[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const wrapRef = useRef<HTMLLabelElement>(null);
    const userTypingRef = useRef(false);

    // Hydrate the initial selection from the live API.
    useEffect(() => {
        if (!initial) return;
        let cancelled = false;
        findAirportApi(initial)
            .then((airport) => {
                if (cancelled || !airport) return;
                setSelected(airport);
                setQuery(`${airport.iata} — ${airport.cityHe}`);
            })
            .catch(() => {/* fallback already set */});
        return () => {
            cancelled = true;
        };
    }, [initial]);

    // Debounced live search.
    useEffect(() => {
        if (!userTypingRef.current) return;
        const controller = new AbortController();
        const handle = setTimeout(async () => {
            setLoading(true);
            setFetchError(null);
            try {
                const term = query.replace(/—.*/, "").trim();
                const results = await searchAirportsApi(term, 12, controller.signal);
                setMatches(results);
            } catch (err) {
                if ((err as Error).name === "AbortError") return;
                setFetchError((err as Error).message ?? t.common.dbError);
                setMatches([]);
            } finally {
                setLoading(false);
            }
        }, 200);
        return () => {
            clearTimeout(handle);
            controller.abort();
        };
    }, [query]);

    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, []);

    const select = (opt: GlobalAirport) => {
        setSelected(opt);
        setQuery(`${opt.iata} — ${opt.cityHe}`);
        setOpen(false);
        userTypingRef.current = false;
    };

    // Tag for unused-var lint; kept to support future programmatic readers.
    void selected;

    return (
        <label className="relative block space-y-1.5" ref={wrapRef}>
            <span className="block text-[11px] font-medium uppercase tracking-wider text-text-secondary">
                {label}
            </span>
            <span className="relative block">
                <MapPin className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-glow" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        userTypingRef.current = true;
                        setQuery(e.target.value);
                        setOpen(true);
                        setHighlight(0);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={(e) => {
                        if (!open) return;
                        if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setHighlight((h) => Math.min(h + 1, matches.length - 1));
                        } else if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setHighlight((h) => Math.max(h - 1, 0));
                        } else if (e.key === "Enter" && matches[highlight]) {
                            e.preventDefault();
                            select(matches[highlight]);
                        } else if (e.key === "Escape") {
                            setOpen(false);
                        }
                    }}
                    autoComplete="off"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 pr-10 text-sm text-text-primary placeholder:text-text-secondary/60 transition-colors focus:border-cyan-jet/60 focus:bg-white/[0.06] focus:outline-none focus:shadow-[0_0_0_4px_rgba(14,165,233,0.12)]"
                />
            </span>

            <AnimatePresence>
                {open && (matches.length > 0 || loading || fetchError) && (
                    <motion.ul
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 left-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-[#0a1330]/95 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.6)] backdrop-blur-xl"
                        role="listbox"
                    >
                        {loading && matches.length === 0 && (
                            <li className="px-3 py-2.5 text-xs text-text-secondary">
                                {t.common.searching}
                            </li>
                        )}
                        {fetchError && (
                            <li className="px-3 py-2.5 text-xs text-danger">
                                {fetchError}
                            </li>
                        )}
                        {matches.map((opt, i) => (
                            <li key={opt.iata}>
                                <button
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => select(opt)}
                                    onMouseEnter={() => setHighlight(i)}
                                    className={cn(
                                        "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-right transition-colors",
                                        i === highlight ? "bg-cyan-jet/15" : "hover:bg-white/[0.05]"
                                    )}
                                >
                                    <span className="font-mono text-xs text-cyan-glow">
                                        {opt.iata}
                                    </span>
                                    <span className="flex-1 text-sm text-text-primary">
                                        {opt.cityHe}
                                    </span>
                                    <span className="text-xs text-text-secondary">
                                        {opt.countryHe}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </motion.ul>
                )}
            </AnimatePresence>
        </label>
    );
}

function ResultRow({
    result,
    index,
    tab,
}: {
    result: PreviewResult;
    index: number;
    tab: Tab;
}) {
    const Icon = tab === "flights" ? Plane : Hotel;
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06, duration: 0.3 }}
            className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-colors hover:border-cyan-jet/40 hover:bg-white/[0.06]"
        >
            <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-cyan-jet/15 text-cyan-glow">
                <Icon className="h-5 w-5" />
            </span>
            <div className="flex-1 min-w-0">
                <p className="font-display text-base font-semibold text-text-primary">
                    {result.title}
                </p>
                <p className="truncate text-xs text-text-secondary">
                    {result.subtitle}
                </p>
            </div>
            <div className="text-left">
                <p className="text-[10px] uppercase tracking-wider text-text-secondary">
                    {t.landing.story2.from$}
                </p>
                <p className="font-mono text-base font-semibold text-text-primary tabular-nums">
                    {result.price}
                </p>
            </div>
            <Link
                href="/register"
                className="btn-gold inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-xs font-semibold"
            >
                <LogIn className="h-3.5 w-3.5" />
                {t.landing.story2.loginToBook}
                <ArrowLeft className="h-3.5 w-3.5" />
            </Link>
        </motion.div>
    );
}
