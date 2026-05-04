"use client";

import {
    motion,
    useMotionValue,
    useSpring,
    useTransform,
    type MotionValue,
} from "framer-motion";
import { Plane, Hotel, Sparkles, type LucideIcon } from "lucide-react";
import { useRef, type PointerEvent } from "react";
import { cn } from "@/utils/cn";
import { formatCurrencyDetailed, formatExpiration } from "@/utils/format";
import type { GiftCardVariant, MockGiftCard } from "@/lib/mockData";

const VARIANT_GRADIENTS: Record<GiftCardVariant, string> = {
    "cyan-jet":
        "linear-gradient(135deg, #021024 0%, #0066FF 35%, #00E5FF 75%, #5BF0FF 100%)",
    "gold-champagne":
        "linear-gradient(135deg, #1A0F02 0%, #4A2E0A 35%, #B7894C 70%, #D4AF7A 100%)",
    "violet-aurora":
        "linear-gradient(135deg, #0A0524 0%, #3A1E8A 35%, #7C5CFF 75%, #B89CFF 100%)",
};

const VARIANT_GLOW: Record<GiftCardVariant, string> = {
    "cyan-jet": "shadow-[0_30px_80px_-20px_rgba(0,229,255,0.55)]",
    "gold-champagne": "shadow-[0_30px_80px_-20px_rgba(212,175,122,0.55)]",
    "violet-aurora": "shadow-[0_30px_80px_-20px_rgba(124,92,255,0.55)]",
};

const VARIANT_ICON: Record<MockGiftCard["category"], LucideIcon> = {
    Flights: Plane,
    Hotels: Hotel,
    Travel: Sparkles,
};

export interface GiftCard3DProps {
    card: MockGiftCard;
    className?: string;
    /** Disable parallax tilt (e.g. inside a swipeable carousel). */
    staticTilt?: boolean;
    onClick?: () => void;
}

/**
 * Premium 3D gift card with mouse-parallax tilt, holographic shimmer,
 * embossed amount, and brand-tier gradient variants.
 */
export function GiftCard3D({
    card,
    className,
    staticTilt = false,
    onClick,
}: GiftCard3DProps) {
    const ref = useRef<HTMLDivElement>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [10, -10]), {
        stiffness: 200,
        damping: 20,
    });
    const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-12, 12]), {
        stiffness: 200,
        damping: 20,
    });
    const glareX = useTransform(x, [-0.5, 0.5], ["20%", "80%"]);
    const glareY = useTransform(y, [-0.5, 0.5], ["20%", "80%"]);

    const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
        if (staticTilt || !ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        x.set((e.clientX - rect.left) / rect.width - 0.5);
        y.set((e.clientY - rect.top) / rect.height - 0.5);
    };

    const handlePointerLeave = () => {
        if (staticTilt) return;
        x.set(0);
        y.set(0);
    };

    const Icon = VARIANT_ICON[card.category];

    return (
        <div
            style={{ perspective: 1200 }}
            className={cn("group relative w-full", className)}
        >
            <motion.div
                ref={ref}
                onPointerMove={handlePointerMove}
                onPointerLeave={handlePointerLeave}
                onClick={onClick}
                role={onClick ? "button" : undefined}
                tabIndex={onClick ? 0 : undefined}
                style={{
                    rotateX: staticTilt ? 0 : rotateX,
                    rotateY: staticTilt ? 0 : rotateY,
                    transformStyle: "preserve-3d",
                    background: VARIANT_GRADIENTS[card.variant],
                }}
                className={cn(
                    "relative aspect-[1.55/1] w-full select-none overflow-hidden rounded-3xl",
                    "border border-white/15 ring-focus",
                    VARIANT_GLOW[card.variant],
                    onClick && "cursor-pointer"
                )}
            >
                {/* Holographic glare following cursor */}
                <motion.div
                    aria-hidden
                    style={{
                        background: `radial-gradient(circle at ${glareX.get()} ${glareY.get()}, rgba(255,255,255,0.45), transparent 55%)`,
                        x: glareX as unknown as MotionValue<number>,
                        y: glareY as unknown as MotionValue<number>,
                    }}
                    className="pointer-events-none absolute inset-0 mix-blend-overlay"
                />

                {/* Static decorative orbs */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute -top-16 -right-12 h-56 w-56 rounded-full opacity-50 blur-3xl"
                    style={{ background: "rgba(255,255,255,0.35)" }}
                />
                <div
                    aria-hidden
                    className="pointer-events-none absolute -bottom-20 -left-12 h-56 w-56 rounded-full opacity-30 blur-3xl"
                    style={{ background: "rgba(0,0,0,0.45)" }}
                />

                {/* Subtle grid texture */}
                <svg
                    aria-hidden
                    className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07]"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <defs>
                        <pattern
                            id={`grid-${card.id}`}
                            width="32"
                            height="32"
                            patternUnits="userSpaceOnUse"
                        >
                            <path
                                d="M 32 0 L 0 0 0 32"
                                fill="none"
                                stroke="white"
                                strokeWidth="0.5"
                            />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill={`url(#grid-${card.id})`} />
                </svg>

                {/* Foreground content */}
                <div
                    style={{ transform: "translateZ(40px)" }}
                    className="relative z-10 flex h-full flex-col justify-between p-6 text-white"
                >
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="font-display text-lg font-semibold tracking-tight">
                                FlyGift
                            </p>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-white/70">
                                {card.category}
                            </p>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                            <Icon className="h-5 w-5" strokeWidth={2} />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-white/60">
                            Amount
                        </p>
                        <p
                            className="font-mono text-3xl font-bold tabular-nums"
                            style={{
                                textShadow:
                                    "0 1px 0 rgba(255,255,255,0.25), 0 -1px 0 rgba(0,0,0,0.35)",
                            }}
                        >
                            {formatCurrencyDetailed(card.amount, card.currency)}
                        </p>
                    </div>

                    <div className="flex items-end justify-between">
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-white/60">
                                Card
                            </p>
                            <p className="font-mono text-sm font-medium tracking-wider">
                                {card.code}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-white/60">
                                Valid Thru
                            </p>
                            <p className="font-mono text-sm font-medium">
                                {formatExpiration(card.expirationDate)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Holographic shimmer sweep */}
                <div
                    aria-hidden
                    className="shimmer-overlay pointer-events-none absolute inset-0 mix-blend-overlay opacity-60"
                />
            </motion.div>
        </div>
    );
}
