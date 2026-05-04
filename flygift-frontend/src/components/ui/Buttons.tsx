"use client";

import { motion } from "framer-motion";
import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/utils/cn";

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    loading?: boolean;
    loadingText?: string;
    children: ReactNode;
}

export function PrimaryButton({
    loading,
    loadingText,
    children,
    className,
    disabled,
    ...rest
}: PrimaryButtonProps) {
    return (
        <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            disabled={disabled || loading}
            className={cn(
                "ring-focus relative inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl",
                "bg-champagne-gradient text-bg-base font-semibold tracking-wide",
                "shadow-glow-gold transition-opacity",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                className
            )}
            {...(rest as React.ComponentPropsWithoutRef<typeof motion.button>)}
        >
            {loading && (
                <span
                    aria-hidden
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                />
            )}
            <span>{loading ? loadingText || "Processing…" : children}</span>
            {!loading && (
                <span
                    aria-hidden
                    className="shimmer-overlay absolute inset-0 mix-blend-overlay opacity-50"
                />
            )}
        </motion.button>
    );
}

export function GhostButton({
    className,
    children,
    ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
    return (
        <motion.button
            whileTap={{ scale: 0.98 }}
            className={cn(
                "ring-focus inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-5",
                "bg-white/[0.04] border border-white/10 text-text-primary font-medium",
                "hover:bg-white/[0.07] transition-colors",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                className
            )}
            {...(rest as React.ComponentPropsWithoutRef<typeof motion.button>)}
        >
            {children}
        </motion.button>
    );
}
