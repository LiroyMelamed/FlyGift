"use client";

import { motion } from "framer-motion";

/**
 * Subtle drifting clouds layer. Place inside a `relative` parent
 * with `overflow-hidden`. Pure CSS — cheap to render.
 */
export function CloudsBackground({ className = "" }: { className?: string }) {
    const clouds = [
        { y: "12%", size: 220, duration: 80, delay: 0, opacity: 0.18 },
        { y: "32%", size: 160, duration: 110, delay: 12, opacity: 0.12 },
        { y: "58%", size: 280, duration: 95, delay: 4, opacity: 0.14 },
        { y: "78%", size: 180, duration: 120, delay: 20, opacity: 0.1 },
    ];

    return (
        <div
            aria-hidden
            className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
        >
            {clouds.map((c, i) => (
                <motion.div
                    key={i}
                    initial={{ x: "-30%" }}
                    animate={{ x: "130%" }}
                    transition={{
                        duration: c.duration,
                        delay: c.delay,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                    style={{
                        top: c.y,
                        width: c.size,
                        height: c.size * 0.55,
                        opacity: c.opacity,
                        background:
                            "radial-gradient(ellipse at center, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.3) 50%, transparent 80%)",
                        filter: "blur(18px)",
                    }}
                    className="absolute"
                />
            ))}
        </div>
    );
}
