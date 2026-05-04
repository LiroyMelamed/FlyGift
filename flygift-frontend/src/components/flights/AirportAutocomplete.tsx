"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plane, MapPin, Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";
import { searchAirportsApi, type GlobalAirport } from "@/lib/airportsApi";
import { t } from "@/i18n/he";

interface Props {
    label: string;
    value: string;
    onChange: (iata: string) => void;
    placeholder?: string;
    error?: string;
    iconTone?: "cyan" | "violet" | "gold";
}

/**
 * IATA airport autocomplete. Live data via /api/airports/search
 * (Next.js Route Handler over the bundled OurAirports dataset).
 */
export function AirportAutocomplete({
    label,
    value,
    onChange,
    placeholder = "עיר או קוד IATA",
    error,
    iconTone = "cyan",
}: Props) {
    const [query, setQuery] = useState(value);
    const [open, setOpen] = useState(false);
    const [activeIdx, setActiveIdx] = useState(0);
    const [matches, setMatches] = useState<GlobalAirport[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => setQuery(value), [value]);

    useEffect(() => {
        function onClick(e: MouseEvent) {
            if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, []);

    // Debounced live search.
    useEffect(() => {
        const controller = new AbortController();
        const handle = setTimeout(async () => {
            setLoading(true);
            setFetchError(null);
            try {
                const results = await searchAirportsApi(query, 8, controller.signal);
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

    const select = (a: GlobalAirport) => {
        onChange(a.iata);
        setQuery(a.iata);
        setOpen(false);
    };

    const toneRing =
        iconTone === "violet"
            ? "from-violet-aurora/30"
            : iconTone === "gold"
                ? "from-[#0F172A]/20"
                : "from-cyan-jet/30";

    return (
        <div className="space-y-1.5" ref={containerRef}>
            <label className="block text-xs font-medium uppercase tracking-wider text-text-secondary">
                {label}
            </label>
            <div className="relative">
                <span
                    aria-hidden
                    className={cn(
                        "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br to-transparent",
                        toneRing
                    )}
                >
                    <Plane className="h-3.5 w-3.5 text-text-primary" />
                </span>
                <input
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value.toUpperCase());
                        setOpen(true);
                        setActiveIdx(0);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={(e) => {
                        if (!open) return;
                        if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setActiveIdx((i) => Math.min(i + 1, matches.length - 1));
                        }
                        if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setActiveIdx((i) => Math.max(i - 1, 0));
                        }
                        if (e.key === "Enter" && matches[activeIdx]) {
                            e.preventDefault();
                            select(matches[activeIdx]);
                        }
                        if (e.key === "Escape") setOpen(false);
                    }}
                    placeholder={placeholder}
                    autoComplete="off"
                    className={cn(
                        "w-full rounded-xl border border-white/10 bg-white/[0.04] px-12 py-3 pr-4",
                        "text-base font-mono uppercase tracking-wider text-text-primary placeholder:text-text-secondary/60 placeholder:normal-case",
                        "transition-all focus:outline-none focus:border-cyan-jet/60 focus:bg-white/[0.06]",
                        "focus:shadow-[0_0_0_4px_rgba(0,229,255,0.08)]",
                        error && "border-danger/60"
                    )}
                />

                <AnimatePresence>
                    {open && (matches.length > 0 || loading || fetchError) && (
                        <motion.ul
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.15 }}
                            className="absolute z-[60] mt-2 w-full overflow-hidden rounded-xl border border-[#0F172A]/15 bg-white shadow-[0_20px_50px_-15px_rgba(15,23,42,0.35)]"
                            role="listbox"
                        >
                            {loading && matches.length === 0 && (
                                <li className="flex items-center gap-2 px-3 py-3 text-xs text-slate-500">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    {t.common.searching}
                                </li>
                            )}
                            {fetchError && (
                                <li className="px-3 py-3 text-xs text-danger">
                                    {fetchError}
                                </li>
                            )}
                            {!loading && !fetchError && matches.length === 0 && query.trim() && (
                                <li className="px-3 py-3 text-xs text-slate-500">
                                    {t.common.noResults}
                                </li>
                            )}
                            {matches.map((a, i) => (
                                <li
                                    key={a.iata}
                                    role="option"
                                    aria-selected={i === activeIdx}
                                    onMouseEnter={() => setActiveIdx(i)}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => select(a)}
                                    className={cn(
                                        "flex cursor-pointer items-center gap-3 px-3 py-2.5 text-right transition-colors",
                                        i === activeIdx ? "bg-[#0EA5E9]/10" : "hover:bg-slate-50"
                                    )}
                                >
                                    <span className="font-mono text-sm font-semibold text-[#0EA5E9] w-12">
                                        {a.iata}
                                    </span>
                                    <span className="flex-1 truncate">
                                        <span className="text-sm text-[#0F172A]">{a.cityHe || a.city}</span>
                                        <span className="mr-2 text-xs text-slate-500">
                                            {a.name}
                                        </span>
                                    </span>
                                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                </li>
                            ))}
                        </motion.ul>
                    )}
                </AnimatePresence>
            </div>
            {error && <p className="text-xs text-danger">{error}</p>}
        </div>
    );
}
