"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { GiftCard3D } from "./GiftCard3D";
import { cn } from "@/utils/cn";
import { nativeBridge } from "@/utils/nativeBridge";
import type { MockGiftCard } from "@/lib/mockData";

export interface GiftCardCarouselProps {
    cards: MockGiftCard[];
    className?: string;
    onSelect?: (card: MockGiftCard) => void;
}

const SWIPE_THRESHOLD = 60;

export function GiftCardCarousel({
    cards,
    className,
    onSelect,
}: GiftCardCarouselProps) {
    const [index, setIndex] = useState(0);
    const [direction, setDirection] = useState<1 | -1>(1);
    const trackRef = useRef<HTMLDivElement>(null);

    const go = (next: number) => {
        if (cards.length === 0) return;
        const wrapped = (next + cards.length) % cards.length;
        setDirection(next > index ? 1 : -1);
        setIndex(wrapped);
        nativeBridge.haptic("light");
    };

    if (cards.length === 0) return null;
    const current = cards[index];

    return (
        <div className={cn("relative", className)}>
            <div
                ref={trackRef}
                className="relative mx-auto flex min-h-[340px] w-full items-center justify-center px-4 py-8"
            >
                <AnimatePresence initial={false} custom={direction} mode="popLayout">
                    <motion.div
                        key={current.id}
                        custom={direction}
                        initial={{ opacity: 0, x: direction * 80, scale: 0.92 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -direction * 80, scale: 0.92 }}
                        transition={{ type: "spring", stiffness: 320, damping: 32 }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.4}
                        onDragEnd={(_, info) => {
                            if (info.offset.x < -SWIPE_THRESHOLD) go(index + 1);
                            else if (info.offset.x > SWIPE_THRESHOLD) go(index - 1);
                        }}
                        className="absolute inset-0 flex items-center justify-center px-4"
                    >
                        <div className="w-full max-w-md">
                            <GiftCard3D card={current} onClick={() => onSelect?.(current)} />
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {cards.length > 1 && (
                <div className="mt-6 flex items-center justify-center gap-3">
                    <button
                        type="button"
                        aria-label="Previous gift card"
                        onClick={() => go(index - 1)}
                        className="ring-focus inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-text-secondary hover:text-text-primary hover:bg-white/10 transition-colors"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>

                    <div className="flex items-center gap-1.5">
                        {cards.map((c, i) => (
                            <button
                                key={c.id}
                                aria-label={`Go to card ${i + 1}`}
                                onClick={() => go(i)}
                                className={cn(
                                    "h-1.5 rounded-full transition-all",
                                    i === index
                                        ? "w-6 bg-cyan-jet shadow-glow-cyan"
                                        : "w-1.5 bg-white/20 hover:bg-white/40"
                                )}
                            />
                        ))}
                    </div>

                    <button
                        type="button"
                        aria-label="Next gift card"
                        onClick={() => go(index + 1)}
                        className="ring-focus inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-text-secondary hover:text-text-primary hover:bg-white/10 transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                </div>
            )}
        </div>
    );
}
