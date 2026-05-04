"use client";

import { motion } from "framer-motion";
import { cn } from "@/utils/cn";

export interface AuroraBackgroundProps {
    className?: string;
    /** Strength of the blobs (0–1). */
    intensity?: number;
    /** Show vignette overlay for stronger contrast. */
    vignette?: boolean;
}

/**
 * Animated aurora background. Place inside a `relative` parent
 * with `overflow-hidden`. Renders three drifting radial gradients.
 */
export function AuroraBackground({
    className,
    intensity = 0.9,
    vignette = true,
}: AuroraBackgroundProps) {
    return (
        <div
            aria-hidden
            className={cn(
                "pointer-events-none absolute inset-0 overflow-hidden",
                className
            )}
        >
            <motion.div
                className="absolute inset-0 bg-aurora-1"
                style={{ opacity: intensity }}
                animate={{
                    x: ["0%", "3%", "-2%", "0%"],
                    y: ["0%", "-2%", "3%", "0%"],
                    scale: [1, 1.08, 0.96, 1],
                }}
                transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                className="absolute inset-0 bg-aurora-2"
                style={{ opacity: intensity }}
                animate={{
                    x: ["0%", "-3%", "2%", "0%"],
                    y: ["0%", "3%", "-2%", "0%"],
                    scale: [1, 0.95, 1.05, 1],
                }}
                transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                className="absolute inset-0 bg-aurora-3"
                style={{ opacity: intensity * 0.85 }}
                animate={{
                    x: ["0%", "2%", "-2%", "0%"],
                    y: ["0%", "-3%", "2%", "0%"],
                    scale: [1, 1.06, 0.97, 1],
                }}
                transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Noise grain for cinematic feel */}
            <div
                className="absolute inset-0 mix-blend-overlay opacity-[0.06]"
                style={{
                    backgroundImage:
                        "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
                }}
            />

            {vignette && (
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            "radial-gradient(ellipse at center, transparent 40%, rgba(5,8,20,0.7) 100%)",
                    }}
                />
            )}
        </div>
    );
}
