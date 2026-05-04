"use client";

import { motion } from "framer-motion";

interface RingProps {
    /** 0..100 */
    value: number;
    size?: number;
    stroke?: number;
    label?: string;
    sublabel?: string;
}

/**
 * Conic gradient ring (Cinematic Skyline) — used for the Redemption Rate KPI.
 * Pure CSS so there's zero chart-lib weight.
 */
export function ProgressRing({
    value,
    size = 132,
    stroke = 12,
    label,
    sublabel,
}: RingProps) {
    const clamped = Math.max(0, Math.min(100, value));
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const offset = c * (1 - clamped / 100);

    return (
        <div className="flex items-center gap-4">
            <svg width={size} height={size} className="-rotate-90">
                <defs>
                    <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#00E5FF" />
                        <stop offset="100%" stopColor="#7C5CFF" />
                    </linearGradient>
                </defs>
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth={stroke}
                    fill="none"
                />
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    stroke="url(#ring-grad)"
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={c}
                    initial={{ strokeDashoffset: c }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                    style={{ filter: "drop-shadow(0 0 8px rgba(0,229,255,0.4))" }}
                />
            </svg>
            <div>
                <p className="font-mono text-3xl font-semibold tabular-nums text-text-primary">
                    {clamped.toFixed(1)}
                    <span className="text-base text-text-secondary">%</span>
                </p>
                {label && (
                    <p className="text-xs uppercase tracking-wider text-text-secondary">
                        {label}
                    </p>
                )}
                {sublabel && (
                    <p className="mt-1 text-xs text-text-secondary">{sublabel}</p>
                )}
            </div>
        </div>
    );
}
