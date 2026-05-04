"use client";

import { motion } from "framer-motion";
import { cn } from "@/utils/cn";

export type GiftCardStatus = "Active" | "Redeemed" | "Expired";

export interface StatusPillProps {
    status: GiftCardStatus | string;
    className?: string;
    size?: "sm" | "md";
}

const STYLES: Record<
    GiftCardStatus,
    { dot: string; ring: string; text: string; glow: string; pulse: boolean }
> = {
    Active: {
        dot: "bg-success",
        ring: "ring-1 ring-success/40",
        text: "text-success",
        glow: "shadow-glow-success",
        pulse: true,
    },
    Redeemed: {
        dot: "bg-cyan-jet",
        ring: "ring-1 ring-cyan-jet/40",
        text: "text-cyan-jet",
        glow: "shadow-glow-cyan",
        pulse: false,
    },
    Expired: {
        dot: "bg-danger",
        ring: "ring-1 ring-danger/40",
        text: "text-danger",
        glow: "shadow-glow-danger",
        pulse: false,
    },
};

const LABELS: Record<GiftCardStatus, string> = {
    Active: "פעיל",
    Redeemed: "מומש",
    Expired: "פג תוקף",
};

const SIZE = {
    sm: "h-6 px-2.5 text-xs gap-1.5",
    md: "h-7 px-3 text-sm gap-2",
} as const;

/**
 * Status indicator pill with optional pulse glow for "Active" state.
 * Accessible: uses semantic role + aria-label.
 */
export function StatusPill({
    status,
    className,
    size = "md",
}: StatusPillProps) {
    const key = (["Active", "Redeemed", "Expired"] as const).includes(
        status as GiftCardStatus
    )
        ? (status as GiftCardStatus)
        : "Redeemed";
    const s = STYLES[key];

    return (
        <span
            role="status"
            aria-label={`Status: ${status}`}
            className={cn(
                "inline-flex items-center rounded-full bg-white/[0.04] backdrop-blur-md font-medium",
                SIZE[size],
                s.ring,
                s.text,
                s.glow,
                className
            )}
        >
            <span className="relative inline-flex h-2 w-2">
                {s.pulse && (
                    <motion.span
                        className={cn("absolute inset-0 rounded-full", s.dot)}
                        animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                    />
                )}
                <span className={cn("relative inline-flex h-2 w-2 rounded-full", s.dot)} />
            </span>
            <span className="leading-none">{LABELS[key]}</span>
        </span>
    );
}
