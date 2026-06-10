"use client";

import {
    motion,
    useMotionTemplate,
    useMotionValue,
    useSpring,
    useTransform,
} from "framer-motion";
import { useMemo, useRef, type PointerEvent } from "react";
import { cn } from "@/utils/cn";

/**
 * FlyGift "Stage 26" Luxury Gift Card.
 *
 * Premium B2C gifting surface — Midnight Blue ground (radial deepens to
 * #050B14 at the edges), stippled gold world map, metallic-gradient
 * FlyGift logo with crescent+plane glyph, white amount "island" with
 * soft shadow, dashed gold→teal→gold flight-path arc, gold-grid QR.
 *
 * Renders at credit-card aspect (1.586:1) with parallax tilt and a
 * cursor-following metallic shimmer (mix-blend-overlay so the gold
 * glints catch light without washing the navy).
 */

/** Subset of MockGiftCard the visual cares about. Anything more is ignored. */
export interface LuxuryGiftCardData {
    amount: number;
    code: string;
    currency?: string;
    originIata?: string;
    destinationIata?: string;
}

interface LuxuryGiftCardProps {
    /** Either pass the gift object (carousel/dashboard/wizard preview)... */
    card?: LuxuryGiftCardData;
    /** ...or pass the four primitives directly (recipient detail page). */
    amount?: number;
    currency?: string;
    /** "FG-XXXX-XXXX". When omitted, a placeholder is rendered (preview mode). */
    code?: string;
    fromCity?: string;
    toCity?: string;
    slogan?: string;
    /** Disable parallax tilt (carousels, screenshot exports, etc.). */
    interactive?: boolean;
    className?: string;
    onClick?: () => void;
}

// Brand palette (Stage 24 + 26).
const NAVY = "#0D1B2A";
const NAVY_DARK = "#050B14";
const GOLD = "#F2C55C";
const GOLD_DEEP = "#C5A059";
const GOLD_SHEEN = "#FBE8B7";
const TEAL = "#00C2CB";
const ICE = "#F1F3F5";

export function LuxuryGiftCard({
    card,
    amount,
    currency: _currency,
    code,
    fromCity,
    toCity,
    slogan = "מתנה שעפים עליה",
    interactive = true,
    className,
    onClick,
}: LuxuryGiftCardProps) {
    // Resolve final values: explicit props win over `card`, with safe
    // placeholders so the wizard preview can render before code is issued.
    const resolvedAmount = amount ?? card?.amount ?? 0;
    const resolvedCode = code ?? card?.code ?? "FG-XXXX-XXXX";
    const resolvedFrom = fromCity ?? card?.originIata ?? "TLV";
    const resolvedTo = toCity ?? card?.destinationIata ?? "JFK";
    void _currency;
    void card?.currency;

    const ref = useRef<HTMLDivElement>(null);

    // ---- Tilt: pointer position normalized to ±0.5, spring-smoothed
    const px = useMotionValue(0);
    const py = useMotionValue(0);
    const sx = useSpring(px, { stiffness: 220, damping: 22 });
    const sy = useSpring(py, { stiffness: 220, damping: 22 });
    const rotateX = useTransform(sy, [-0.5, 0.5], [8, -8]);
    const rotateY = useTransform(sx, [-0.5, 0.5], [-12, 12]);

    // ---- Shimmer: a diagonal gold sweep that follows the cursor.
    // mix-blend-overlay lets the gold "catch" the navy underneath
    // instead of just lightening it (mix-blend-screen feels softer).
    const shimmerX = useTransform(sx, [-0.5, 0.5], ["-30%", "130%"]);
    const shimmerY = useTransform(sy, [-0.5, 0.5], ["-30%", "130%"]);
    const shimmerBg = useMotionTemplate`
        radial-gradient(
            520px 260px at calc(${shimmerX} + 0px) calc(${shimmerY} + 0px),
            rgba(251, 232, 183, 0.45) 0%,
            rgba(242, 197, 92, 0.18) 35%,
            transparent 70%
        )
    `;

    const onMove = (e: PointerEvent<HTMLDivElement>) => {
        if (!interactive || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width - 0.5);
        py.set((e.clientY - r.top) / r.height - 0.5);
    };
    const onLeave = () => {
        if (!interactive) return;
        px.set(0);
        py.set(0);
    };

    const formattedAmount = useMemo(
        () =>
            new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 0,
            }).format(resolvedAmount),
        [resolvedAmount],
    );

    return (
        <div
            className={cn(
                "relative inline-block w-full max-w-[420px] rounded-[24px]",
                onClick && "cursor-pointer",
                className,
            )}
            style={{ perspective: 1200 }}
            onClick={onClick}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={(e) => {
                if (onClick && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onClick();
                }
            }}
        >
            <motion.div
                ref={ref}
                onPointerMove={onMove}
                onPointerLeave={onLeave}
                style={{
                    rotateX,
                    rotateY,
                    transformStyle: "preserve-3d",
                }}
                className={cn(
                    "relative aspect-[1.586/1] w-full overflow-hidden rounded-[24px]",
                    "ring-1 ring-[rgba(242,197,92,0.22)]",
                    "shadow-[0_28px_60px_-18px_rgba(13,27,42,0.7)]",
                )}
            >
                {/* z-0 background stack — explicit so content can never
                    end up behind the map regardless of source order. */}

                {/* 1. Navy ground — radial vignette per spec */}
                <div
                    aria-hidden
                    className="absolute inset-0 z-0"
                    style={{
                        background:
                            `radial-gradient(ellipse 80% 70% at 50% 40%, ${NAVY} 0%, ${NAVY_DARK} 80%, #02060d 100%)`,
                    }}
                />

                {/* 2. Stippled gold world map */}
                <div className="absolute inset-0 z-0">
                    <DottedWorldMap />
                </div>

                {/* 3. Soft corner glints (gold + teal) for depth */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 z-0"
                    style={{
                        background:
                            `radial-gradient(circle at 8% 10%, rgba(242,197,92,0.18) 0%, transparent 35%),` +
                            `radial-gradient(circle at 92% 90%, rgba(0,194,203,0.14) 0%, transparent 40%)`,
                    }}
                />

                {/* 4. Cursor shimmer — mix-blend-overlay = real metal glint.
                    Sits ABOVE map (z-10) so the gold dots catch it; content
                    (z-20) renders on top so text stays crisp. */}
                <motion.div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 z-10 mix-blend-overlay"
                    style={{ background: shimmerBg }}
                />

                {/* 5. Content */}
                <div className="relative z-20 flex h-full flex-col px-5 py-4 sm:px-6 sm:py-5">
                    {/* Top: centered logo + Hebrew slogan, hugged to the top */}
                    <div className="flex flex-col items-center gap-2">
                        <FlyGiftLogo />
                        <p
                            dir="rtl"
                            className="text-[9px] sm:text-[10px] font-medium uppercase"
                            style={{
                                color: GOLD,
                                fontFamily: "var(--font-heebo), system-ui, sans-serif",
                                letterSpacing: "0.18em",
                            }}
                        >
                            {slogan}
                        </p>
                    </div>

                    {/* Center: white amount island. `my-auto` parks it in the
                        middle of whatever vertical space remains between top
                        and bottom blocks, with no manual gap fighting. */}
                    <div className="my-auto flex justify-center">
                        <AmountIsland amount={formattedAmount} />
                    </div>

                    {/* Flight path arc — full-width, just under the amount,
                        with its own breathing room above the bottom row. */}
                    <FlightArc fromCity={resolvedFrom} toCity={resolvedTo} />

                    {/* Bottom: code only (QR removed) */}
                    <div className="mt-3 flex items-end justify-end gap-3">
                        <div className="text-right">
                            <p
                                className="text-[8px] uppercase tracking-[0.32em]"
                                style={{ color: TEAL }}
                            >
                                Gift code
                            </p>
                            <p
                                className="mt-0.5 font-mono text-xs sm:text-sm font-semibold tracking-[0.2em]"
                                style={{ color: ICE }}
                                dir="ltr"
                            >
                                {resolvedCode}
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Logo — FLY [crescent+plane glyph] GIFT in a flex row               */
/* ------------------------------------------------------------------ */

/**
 * HTML flex layout — far more reliable than SVG <text> positioning,
 * which was clipping into the glyph because letter widths don't match
 * the manually-placed x coordinates. The metallic gold uses
 * `background-clip: text` over a 4-stop sheen gradient.
 */
function FlyGiftLogo() {
    const goldText: React.CSSProperties = {
        backgroundImage: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_SHEEN} 35%, ${GOLD_DEEP} 65%, ${GOLD} 100%)`,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        WebkitTextFillColor: "transparent",
        fontFamily: "var(--font-display, system-ui), sans-serif",
        fontWeight: 800,
        letterSpacing: "0.04em",
        lineHeight: 1,
    };

    return (
        // dir="ltr" so the flex order isn't flipped by an RTL ancestor.
        <div dir="ltr" className="flex items-center gap-1.5 sm:gap-2 select-none">
            <span className="text-lg sm:text-xl" style={goldText}>FLY</span>
            <CrescentPlaneGlyph />
            <span className="text-lg sm:text-xl" style={goldText}>GIFT</span>
        </div>
    );
}

function CrescentPlaneGlyph() {
    // airplane shape: fuselage, wings, tail, nose, with more clarity
    return (
        <svg
            viewBox="-14 -14 28 28"
            className="h-6 w-6 sm:h-7 sm:w-7 shrink-0"
            aria-hidden
        >
            <defs>
                <linearGradient id="lux-gold-glyph" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={GOLD} />
                    <stop offset="35%" stopColor={GOLD_SHEEN} />
                    <stop offset="65%" stopColor={GOLD_DEEP} />
                    <stop offset="100%" stopColor={GOLD} />
                </linearGradient>
            </defs>
            {/* Crescent: outer disc minus offset inner disc */}
            <path
                d="M -1 -11 a 11 11 0 1 0 0 22 a 8 8 0 1 1 0 -22 z"
                fill="url(#lux-gold-glyph)"
            />
            {/* Plane silhouette, more clear and stylized */}
            <g transform="translate(2 0) rotate(-15)">
                {/* Fuselage */}
                <rect x="-6" y="-0.7" width="11" height="1.4" rx="0.5" fill={GOLD_DEEP} stroke={NAVY_DARK} strokeWidth="0.3" />
                {/* Nose */}
                <circle cx="5.5" cy="0" r="0.7" fill={GOLD_SHEEN} stroke={NAVY_DARK} strokeWidth="0.2" />
                {/* Wings */}
                <rect x="-2" y="-2.2" width="4.5" height="0.7" rx="0.3" fill={GOLD_DEEP} stroke={NAVY_DARK} strokeWidth="0.2" />
                <rect x="-2" y="1.5" width="4.5" height="0.7" rx="0.3" fill={GOLD_DEEP} stroke={NAVY_DARK} strokeWidth="0.2" />
                {/* Tail */}
                <rect x="-6.5" y="-0.5" width="1.2" height="1" rx="0.3" fill={GOLD_DEEP} stroke={NAVY_DARK} strokeWidth="0.2" />
            </g>
        </svg>
    );
}

/* ------------------------------------------------------------------ */
/* White amount "island"                                              */
/* ------------------------------------------------------------------ */

function AmountIsland({ amount }: { amount: string }) {
    // No pill — metallic gold text on the navy ground for a more
    // premium, less "tag-like" feel. Soft drop-shadow keeps it readable
    // over the dot pattern.
    const goldFill: React.CSSProperties = {
        backgroundImage: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_SHEEN} 35%, ${GOLD_DEEP} 65%, ${GOLD} 100%)`,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        WebkitTextFillColor: "transparent",
        filter: "drop-shadow(0 2px 8px rgba(0, 0, 0, 0.45))",
    };
    return (
        <p
            dir="ltr"
            className="font-mono text-3xl sm:text-4xl font-extrabold tabular-nums leading-none"
            style={goldFill}
        >
            {amount}
        </p>
    );
}

/* ------------------------------------------------------------------ */
/* Flight path arc                                                    */
/* ------------------------------------------------------------------ */

function FlightArc({ fromCity, toCity }: { fromCity: string; toCity: string }) {
    return (
        <div className="mt-3 flex w-full items-center gap-2">
            <span
                className="font-mono text-[10px] tracking-[0.2em] shrink-0"
                style={{ color: ICE, opacity: 0.75 }}
                dir="ltr"
            >
                {fromCity}
            </span>
            <svg
                viewBox="0 0 200 24"
                preserveAspectRatio="none"
                className="h-5 flex-1"
                aria-hidden
            >
                <defs>
                    <linearGradient id="arc-stroke" x1="0" x2="1">
                        <stop offset="0%" stopColor={GOLD} stopOpacity="0.95" />
                        <stop offset="50%" stopColor={TEAL} stopOpacity="0.95" />
                        <stop offset="100%" stopColor={GOLD} stopOpacity="0.95" />
                    </linearGradient>
                </defs>
                <circle cx="6" cy="18" r="2.6" fill={GOLD} />
                <circle cx="194" cy="18" r="2.6" fill={GOLD} />
                <path
                    d="M 6 18 Q 100 -8 194 18"
                    stroke="url(#arc-stroke)"
                    strokeWidth="1.4"
                    strokeDasharray="3 3"
                    fill="none"
                    vectorEffect="non-scaling-stroke"
                />
                <g transform="translate(100 4)">
                    <path d="M -4 0 L 4 0 L 6 -1.4 L 4 1.4 L 0 3.6 L -4 1.4 Z" fill={ICE} />
                </g>
            </svg>
            <span
                className="font-mono text-[10px] tracking-[0.2em] shrink-0"
                style={{ color: ICE, opacity: 0.75 }}
                dir="ltr"
            >
                {toCity}
            </span>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Stippled gold world map                                            */
/* ------------------------------------------------------------------ */

function DottedWorldMap() {
    const dots = useMemo(() => buildDots(), []);
    return (
        <svg
            viewBox="0 0 200 100"
            preserveAspectRatio="xMidYMid slice"
            className="absolute inset-0 h-full w-full"
            aria-hidden
        >
            {dots.map((d, i) => (
                <circle
                    key={i}
                    cx={d.x}
                    cy={d.y}
                    r={d.r}
                    fill={GOLD}
                    opacity={d.a}
                />
            ))}
        </svg>
    );
}

interface Dot { x: number; y: number; r: number; a: number; }

// Round to 3 decimal places so SSR and client serialize identical SVG
// attribute strings. Without this, Math.sin's last-bit float drift
// between server and client renders triggers a React hydration mismatch.
const round3 = (v: number) => Math.round(v * 1000) / 1000;

function buildDots(): Dot[] {
    // Continent rectangles in 0..200 / 0..100 space. Density value
    // controls dot probability (higher = denser stippling).
    const masks: Array<{ x0: number; y0: number; x1: number; y1: number; d: number }> = [
        { x0: 16, y0: 22, x1: 56, y1: 50, d: 0.62 },   // North America
        { x0: 38, y0: 50, x1: 62, y1: 80, d: 0.62 },   // South America
        { x0: 88, y0: 18, x1: 116, y1: 44, d: 0.62 },  // Europe
        { x0: 95, y0: 42, x1: 122, y1: 78, d: 0.62 },  // Africa
        { x0: 116, y0: 16, x1: 174, y1: 56, d: 0.62 }, // Asia
        { x0: 152, y0: 62, x1: 184, y1: 82, d: 0.62 }, // Oceania
    ];

    const step = 3.2; // מעט פחות צפוף
    const dots: Dot[] = [];
    const minDist = 1.7; // מרחק מינימלי בין נקודות
    for (let y = 4; y < 96; y += step) {
        for (let x = 4; x < 196; x += step) {
            let inside = 0;
            for (const m of masks) {
                if (x >= m.x0 && x <= m.x1 && y >= m.y0 && y <= m.y1) {
                    inside = Math.max(inside, m.d);
                }
            }
            if (inside === 0) {
                if (((x * 7 + y * 11) | 0) % 13 !== 0) continue;
                const px = round3(jitter(x, 0.25));
                const py = round3(jitter(y, 0.25));
                if (dots.some(d => (d.x - px) ** 2 + (d.y - py) ** 2 < minDist ** 2)) continue;
                dots.push({
                    x: px,
                    y: py,
                    r: 0.32,
                    a: 0.05,
                });
                continue;
            }
            const n = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
            if (n > inside) continue;
            const px = round3(jitter(x, 0.38));
            const py = round3(jitter(y, 0.38));
            if (dots.some(d => (d.x - px) ** 2 + (d.y - py) ** 2 < minDist ** 2)) continue;
            dots.push({
                x: px,
                y: py,
                r: round3(0.55 + n * 0.45),
                a: round3(0.22 + n * 0.18),
            });
        }
    }
    return dots;
}

function jitter(v: number, amt: number) {
    const n = Math.sin(v * 91.342) * 10000;
    return v + (n - Math.floor(n) - 0.5) * amt;
}

