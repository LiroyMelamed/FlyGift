"use client";

import { motion } from "framer-motion";
import type { DestinationPoint } from "@/lib/analyticsTypes";

interface Props {
    data: DestinationPoint[];
}

const TONES = [
    "from-cyan-jet/80 to-cyan-jet/30",
    "from-violet-aurora/80 to-violet-aurora/30",
    "from-gold-champagne/80 to-gold-champagne/30",
];

export function TopDestinationsChart({ data }: Props) {
    const max = Math.max(...data.map((d) => d.trips), 1);

    return (
        <div className="space-y-3">
            {data.map((d, i) => {
                const pct = (d.trips / max) * 100;
                return (
                    <div key={d.iata} className="flex items-center gap-3">
                        <div className="w-12 shrink-0">
                            <p className="font-mono text-sm font-semibold text-text-primary">
                                {d.iata}
                            </p>
                            <p className="text-[10px] text-text-secondary truncate">
                                {d.city}
                            </p>
                        </div>
                        <div className="flex-1 relative h-6 overflow-hidden rounded-full bg-white/[0.04]">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.8, delay: i * 0.05, ease: "easeOut" }}
                                className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${TONES[i % TONES.length]
                                    }`}
                                style={{
                                    boxShadow:
                                        i === 0 ? "0 0 14px rgba(0,229,255,0.35)" : undefined,
                                }}
                            />
                        </div>
                        <p className="w-10 text-right font-mono text-sm tabular-nums text-text-primary">
                            {d.trips}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}
