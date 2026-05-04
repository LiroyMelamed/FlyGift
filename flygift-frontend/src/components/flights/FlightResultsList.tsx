"use client";

import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { FlightOfferCard } from "./FlightOfferCard";
import type { FlightOffer } from "@/lib/flightTypes";

interface Props {
    offers: FlightOffer[];
    isLoading?: boolean;
    onSelect: (offer: FlightOffer) => void;
}

export function FlightResultsList({ offers, isLoading, onSelect }: Props) {
    if (isLoading) {
        return (
            <div className="space-y-3">
                {[0, 1, 2, 3].map((i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.05 }}
                    >
                        <GlassCard padding="md" className="animate-pulse">
                            <div className="flex items-center gap-4">
                                <div className="h-11 w-11 rounded-xl bg-white/[0.06]" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-3/4 rounded bg-white/[0.06]" />
                                    <div className="h-3 w-1/2 rounded bg-white/[0.04]" />
                                </div>
                                <div className="h-6 w-20 rounded bg-white/[0.06]" />
                            </div>
                        </GlassCard>
                    </motion.div>
                ))}
            </div>
        );
    }

    if (!offers.length) {
        return (
            <GlassCard padding="lg" className="text-center">
                <p className="text-text-secondary">לא נמצאו טיסות למסלול זה.</p>
            </GlassCard>
        );
    }

    return (
        <div className="space-y-3">
            {offers.map((o, i) => (
                <FlightOfferCard key={o.id} offer={o} index={i} onSelect={onSelect} />
            ))}
        </div>
    );
}
