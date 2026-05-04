"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { Plane } from "lucide-react";

/**
 * Tiny brand motif: a small plane that drifts horizontally across the
 * top of the viewport in response to page scroll. Reused on every app
 * page so the FlyGift "flight" identity stays consistent.
 */
export function ScrollingPlane() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const { scrollYProgress } = useScroll();
    // Flies right → left in RTL (start at right, drift to left).
    const xRaw = useTransform(scrollYProgress, [0, 1], ["8vw", "92vw"]);
    const yRaw = useTransform(scrollYProgress, [0, 1], [0, -10]);
    const rotateRaw = useTransform(scrollYProgress, [0, 1], [-6, 6]);
    const x = useSpring(xRaw, { stiffness: 60, damping: 20 });
    const y = useSpring(yRaw, { stiffness: 60, damping: 20 });
    const rotate = useSpring(rotateRaw, { stiffness: 60, damping: 20 });

    if (!mounted) return null;

    return (
        <motion.div
            aria-hidden
            className="pointer-events-none fixed top-20 z-[5] hidden sm:block"
            style={{
                right: x,
                y,
                rotate,
            }}
        >
            <span className="relative inline-flex h-7 w-7 items-center justify-center">
                <span
                    aria-hidden
                    className="absolute right-full top-1/2 -translate-y-1/2 mr-1 h-px w-16 origin-right"
                    style={{
                        background:
                            "linear-gradient(to left, rgba(14,165,233,0.55) 0%, transparent 100%)",
                    }}
                />
                <Plane
                    className="h-5 w-5 text-[#0EA5E9] drop-shadow-[0_2px_8px_rgba(14,165,233,0.5)]"
                    style={{ transform: "rotate(-45deg)" }}
                />
            </span>
        </motion.div>
    );
}
