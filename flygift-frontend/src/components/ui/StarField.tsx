"use client";

import { useMemo } from "react";

export interface StarFieldProps {
    /** Total star count. Higher = denser. Default 120. */
    count?: number;
    /** Optional className for the wrapper. */
    className?: string;
}

/**
 * Pure-CSS deterministic star field. Twinkles via CSS `@keyframes` so
 * there's zero JS animation cost — safe to leave running across the
 * whole site. Place inside a `relative` (or fixed) `overflow-hidden`
 * parent.
 */
export function StarField({ count = 120, className = "" }: StarFieldProps) {
    const stars = useMemo(() => {
        // Deterministic PRNG so SSR & hydration match.
        let s = 1234567;
        const rand = () => {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };
        return Array.from({ length: count }, (_, i) => {
            const r = rand();
            const size = r < 0.85 ? 1 : r < 0.97 ? 2 : 3;
            const cyan = rand() < 0.18;
            return {
                key: i,
                top: `${rand() * 100}%`,
                left: `${rand() * 100}%`,
                size,
                cyan,
                delay: rand() * 6,
                duration: 3 + rand() * 5,
                opacity: 0.45 + rand() * 0.5,
            };
        });
    }, [count]);

    return (
        <div
            aria-hidden
            className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
        >
            {stars.map((st) => (
                <span
                    key={st.key}
                    className="star-twinkle absolute rounded-full"
                    style={{
                        top: st.top,
                        left: st.left,
                        width: st.size,
                        height: st.size,
                        background: st.cyan ? "#5BF0FF" : "#FFFFFF",
                        opacity: st.opacity,
                        boxShadow: st.cyan
                            ? "0 0 6px rgba(91,240,255,0.8)"
                            : st.size > 1
                                ? "0 0 4px rgba(255,255,255,0.55)"
                                : undefined,
                        animationDelay: `${st.delay}s`,
                        animationDuration: `${st.duration}s`,
                    }}
                />
            ))}
        </div>
    );
}
