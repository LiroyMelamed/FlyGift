"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";
import { cn } from "@/utils/cn";

type Tone = "default" | "elevated" | "subtle";
type Padding = "none" | "sm" | "md" | "lg";

export interface GlassCardProps extends HTMLMotionProps<"div"> {
    tone?: Tone;
    padding?: Padding;
    interactive?: boolean;
    glow?: "none" | "cyan" | "gold";
    /** Allow children (e.g. autocomplete dropdowns) to escape the card edge. */
    allowOverflow?: boolean;
}

const toneStyles: Record<Tone, string> = {
    default: "glass shadow-glass",
    elevated: "glass-strong shadow-glass",
    subtle: "bg-white/[0.03] border border-white/5",
};

const paddingStyles: Record<Padding, string> = {
    none: "",
    sm: "p-3",
    md: "p-5",
    lg: "p-8",
};

const glowStyles = {
    none: "",
    cyan: "shadow-glow-cyan",
    gold: "shadow-glow-gold",
} as const;

/**
 * Premium glassmorphism container.
 * Use as the building block for cards, panels, and modals.
 */
export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
    function GlassCard(
        {
            tone = "default",
            padding = "md",
            interactive = false,
            glow = "none",
            allowOverflow = false,
            className,
            children,
            ...rest
        },
        ref
    ) {
        return (
            <motion.div
                ref={ref}
                whileHover={interactive ? { y: -2, scale: 1.005 } : undefined}
                whileTap={interactive ? { scale: 0.995 } : undefined}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className={cn(
                    "relative rounded-2xl",
                    !allowOverflow && "overflow-hidden",
                    toneStyles[tone],
                    paddingStyles[padding],
                    glowStyles[glow],
                    interactive && "cursor-pointer",
                    className
                )}
                {...rest}
            >
                {children}
            </motion.div>
        );
    }
);
