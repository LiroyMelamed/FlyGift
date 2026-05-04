"use client";

import { motion } from "framer-motion";
import { Plane, Sparkles } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/utils/cn";
import { formatCurrencyDetailed } from "@/utils/format";
import { t } from "@/i18n/he";
import type { FlightOffer } from "@/lib/flightTypes";

interface Props {
    offer: FlightOffer;
    onSelect: (offer: FlightOffer) => void;
    index?: number;
}

function formatDuration(min: number) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

export function FlightOfferCard({ offer, onSelect, index = 0 }: Props) {
    const isRoundTrip = offer.slices.length > 1;
    const stopsLabel =
        offer.stops === 0
            ? t.flights.nonstop
            : offer.stops === 1
                ? t.flights.oneStop
                : t.flights.nStops(offer.stops);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.04 }}
        >
            <GlassCard
                padding="md"
                interactive
                allowOverflow
                glow={offer.isBestPrice ? "cyan" : "none"}
                onClick={() => onSelect(offer)}
                className={cn(
                    "relative",
                    offer.isBestPrice && "ring-1 ring-cyan-jet/40"
                )}
            >
                {offer.isBestPrice && (
                    <div className="absolute -top-2 right-4 inline-flex items-center gap-1 rounded-full bg-[#0F172A] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white shadow-[0_8px_20px_-8px_rgba(15,23,42,0.6)]">
                        <Sparkles className="h-3 w-3" />
                        {t.flights.bestPrice}
                    </div>
                )}

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    {/* Carrier */}
                    <div className="flex items-center gap-3 sm:contents">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
                            <Plane className="h-5 w-5 text-cyan-jet" />
                        </div>
                        {isRoundTrip && (
                            <span className="inline-flex items-center rounded-full border border-cyan-jet/40 bg-cyan-jet/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-cyan-glow sm:hidden">
                                {t.flights.roundTrip}
                            </span>
                        )}
                    </div>

                    {/* Slices */}
                    <div className="flex-1 min-w-0 space-y-2">
                        {offer.slices.map((slice, sIdx) => (
                            <SliceRow
                                key={sIdx}
                                slice={slice}
                                isReturn={sIdx > 0}
                                stopsLabel={sIdx === 0 ? stopsLabel : undefined}
                                carrierName={sIdx === 0 ? offer.carrier.name : undefined}
                            />
                        ))}
                        {isRoundTrip && (
                            <span className="hidden sm:inline-flex items-center rounded-full border border-cyan-jet/40 bg-cyan-jet/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-cyan-glow">
                                {t.flights.roundTrip}
                            </span>
                        )}
                    </div>

                    {/* Price */}
                    <div className="text-right shrink-0 sm:text-left" dir="ltr">
                        <p className="font-mono text-xl font-semibold tabular-nums text-text-primary">
                            {formatCurrencyDetailed(offer.price.total, offer.price.currency)}
                        </p>
                        {offer.isBestPrice && offer.bestPriceReason && (
                            <p className="text-[10px] uppercase tracking-wider text-text-secondary">
                                {(() => {
                                    const m = offer.bestPriceReason.match(/(\d+)/);
                                    return m
                                        ? t.flights.belowMarket(parseInt(m[1], 10))
                                        : offer.bestPriceReason;
                                })()}
                            </p>
                        )}
                        {!offer.isBestPrice &&
                            offer.price.marketMedian > offer.price.total && (
                                <p className="text-[10px] text-text-secondary">
                                    {t.flights.median}{" "}
                                    {formatCurrencyDetailed(
                                        offer.price.marketMedian,
                                        offer.price.currency
                                    )}
                                </p>
                            )}
                    </div>
                </div>
            </GlassCard>
        </motion.div>
    );
}

function SliceRow({
    slice,
    isReturn,
    stopsLabel,
    carrierName,
}: {
    slice: FlightOffer["slices"][number];
    isReturn: boolean;
    stopsLabel?: string;
    carrierName?: string;
}) {
    return (
        <div>
            <div className="flex items-baseline gap-2 sm:gap-3">
                <span className="text-[10px] uppercase tracking-wider text-text-secondary w-10 shrink-0">
                    {isReturn ? t.flights.returnDate : t.flights.depart}
                </span>
                <p className="font-mono text-base sm:text-lg font-semibold tabular-nums">
                    {formatTime(slice.departureUtc)}
                </p>
                <div className="flex-1 flex items-center gap-1.5 text-text-secondary">
                    <span className="font-mono text-xs">{slice.origin.iata}</span>
                    <span className="flex-1 border-t border-dashed border-white/15" />
                    <span className="text-[10px] uppercase tracking-wider whitespace-nowrap">
                        {formatDuration(slice.durationMinutes)}
                    </span>
                    <span className="flex-1 border-t border-dashed border-white/15" />
                    <span className="font-mono text-xs">{slice.destination.iata}</span>
                </div>
                <p className="font-mono text-base sm:text-lg font-semibold tabular-nums">
                    {formatTime(slice.arrivalUtc)}
                </p>
            </div>
            {(carrierName || stopsLabel) && (
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-secondary pr-12">
                    {carrierName && <span className="text-text-primary">{carrierName}</span>}
                    {carrierName && stopsLabel && <span>·</span>}
                    <span>{slice.segments[0].flightNumber}</span>
                    {stopsLabel && (
                        <>
                            <span>·</span>
                            <span>{stopsLabel}</span>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
