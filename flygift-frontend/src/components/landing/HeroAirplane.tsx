"use client";

import { useRef } from "react";
import Link from "next/link";
import {
    motion,
    AnimatePresence,
    useScroll,
    useTransform,
    useMotionValue,
    useSpring,
    type MotionValue,
} from "framer-motion";
import { Plane, Sparkles, ChevronDown } from "lucide-react";
import { t } from "@/i18n/he";
import { useTheme } from "@/theme/ThemeProvider";
import { useLoginOverlay } from "./LoginOverlayContext";

/**
 * Stage 21 — Day & Night Flight hero.
 *
 * Sky / clouds / lighting all swap with the theme via 0.8s cross-fade.
 * - Light: pastel-blue → white sky, soft white volumetric clouds, warm sun rim-light.
 * - Dark : midnight → cyan glow, darker clouds with cyan edge halos, twinkling stars,
 *          stronger emissive engine trail.
 */
export function HeroAirplane() {
    const ref = useRef<HTMLDivElement>(null);
    const { isDark } = useTheme();
    const { open: openLogin } = useLoginOverlay();

    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start start", "end start"],
    });

    const planeX = useTransform(scrollYProgress, [0, 1], ["2%", "-32%"]);
    const planeY = useTransform(scrollYProgress, [0, 1], ["0%", "-22%"]);
    const planeRotate = useTransform(scrollYProgress, [0, 1], [6, 22]);
    const planeScale = useTransform(scrollYProgress, [0, 1], [1, 1.18]);

    const cloudsBackX = useTransform(scrollYProgress, [0, 1], ["0%", "-12%"]);
    const cloudsMidX = useTransform(scrollYProgress, [0, 1], ["0%", "26%"]);
    const cloudsFrontX = useTransform(scrollYProgress, [0, 1], ["0%", "-40%"]);
    const cloudsOpacity = useTransform(scrollYProgress, [0.5, 1], [1, 0.2]);

    // Cursor parallax → soft bank
    const mx = useMotionValue(0);
    const my = useMotionValue(0);
    const bankRaw = useTransform(mx, [-0.5, 0.5], [-4, 4]);
    const pitchRaw = useTransform(my, [-0.5, 0.5], [3, -3]);
    const bank = useSpring(bankRaw, { stiffness: 80, damping: 16 });
    const pitch = useSpring(pitchRaw, { stiffness: 80, damping: 16 });

    const planeRotateCombined = useTransform(
        [planeRotate, bank] as unknown as MotionValue<number>[],
        ([r, b]) => Number(r) + Number(b)
    );

    const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
    };
    const onLeave = () => {
        mx.set(0);
        my.set(0);
    };

    return (
        <section
            ref={ref}
            onPointerMove={onMove}
            onPointerLeave={onLeave}
            className="relative isolate flex min-h-[100svh] w-full items-center justify-center overflow-hidden pt-20 sm:pt-0"
        >
            {/* Sky base intentionally omitted — the global AppShell background
                (stars in dark, soft clouds in light) shows through so there's
                no visible seam between the hero and the next section. */}

            {/* Sun / Moon disc */}
            <CelestialBody isDark={isDark} />

            {/* Stars (only night) */}
            <AnimatePresence>
                {isDark && (
                    <motion.div
                        key="stars"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                        className="absolute inset-0 -z-20"
                    >
                        <StarField />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Cloud layers (back → front), tinted per theme */}
            <CloudLayer mvX={cloudsBackX} mvOpacity={cloudsOpacity} depth="back" isDark={isDark} />
            <CloudLayer mvX={cloudsMidX} mvOpacity={cloudsOpacity} depth="mid" isDark={isDark} />

            {/* The plane — sits in the lower half so it doesn't obscure the headline */}
            <motion.div
                style={{
                    x: planeX,
                    y: planeY,
                    rotate: planeRotateCombined,
                    scale: planeScale,
                }}
                className="pointer-events-none absolute inset-x-0 top-[72%] flex justify-center -z-10"
            >
                <motion.div
                    style={{ rotateX: pitch, transformPerspective: 1200 }}
                    className="will-change-transform"
                >
                    <CleanPlane isDark={isDark} />
                </motion.div>
            </motion.div>

            <CloudLayer mvX={cloudsFrontX} mvOpacity={cloudsOpacity} depth="front" isDark={isDark} />

            {/* Foreground content */}
            <div
                className="relative z-20 mx-auto flex w-full max-w-screen-xl flex-col items-center px-6 text-center"
                dir="rtl"
            >
                <motion.span
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="inline-flex items-center gap-2 rounded-full border border-cyan-deep/30 bg-cyan-deep/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-cyan-deep backdrop-blur-md dark:border-cyan-jet/40 dark:bg-cyan-jet/10 dark:text-cyan-glow"
                >
                    <Sparkles className="h-3 w-3" />
                    {t.landing.hero.badge}
                </motion.span>

                <motion.h1
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                    className="mt-5 font-display text-5xl font-semibold leading-[1.05] tracking-tight text-text-primary sm:text-6xl md:text-7xl"
                >
                    {t.landing.hero.titleLine1}{" "}
                    <span className="brand-glow">{t.landing.hero.titleHighlight}</span>
                    <br />
                    <span className="text-text-primary/90">
                        {t.landing.hero.titleLine2}
                    </span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.2 }}
                    className="mt-6 max-w-xl text-base text-text-secondary sm:text-lg"
                >
                    {t.landing.hero.subtitle}
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.35 }}
                    className="mt-8 flex flex-col items-center gap-3 sm:flex-row"
                >
                    <Link
                        href="/register"
                        className="btn-gold inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 text-sm font-semibold"
                    >
                        <Sparkles className="h-4 w-4" />
                        {t.landing.hero.ctaPrimary}
                    </Link>
                    <button
                        type="button"
                        onClick={openLogin}
                        className="inline-flex h-12 items-center justify-center rounded-full border border-border-glass bg-bg-glass px-7 text-sm font-medium text-text-primary backdrop-blur-md transition-colors hover:opacity-90"
                    >
                        {t.landing.hero.ctaSecondary}
                    </button>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.7, y: [0, 6, 0] }}
                    transition={{
                        opacity: { delay: 1, duration: 0.8 },
                        y: { delay: 1, duration: 2.4, repeat: Infinity, ease: "easeInOut" },
                    }}
                    className="mt-16 inline-flex flex-col items-center gap-1 text-[11px] uppercase tracking-[0.25em] text-text-secondary"
                >
                    {t.landing.hero.scrollHint}
                    <ChevronDown className="h-4 w-4" />
                </motion.div>
            </div>
        </section>
    );
}

// ───────────────────────── Sun / Moon ─────────────────────────

function CelestialBody({ isDark }: { isDark: boolean }) {
    return (
        <AnimatePresence mode="wait" initial={false}>
            <motion.div
                key={isDark ? "moon" : "sun"}
                initial={{ opacity: 0, y: -40, rotate: -30 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                exit={{ opacity: 0, y: 40, rotate: 30 }}
                transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                aria-hidden
                className="absolute -z-25 left-[12%] top-[14%] h-40 w-40"
            >
                {isDark ? (
                    <div
                        className="h-full w-full rounded-full"
                        style={{
                            background:
                                "radial-gradient(circle at 35% 35%, #F8FBFF 0%, #C5D6F0 40%, #6E7FA8 70%, transparent 80%)",
                            boxShadow:
                                "0 0 80px rgba(91, 240, 255, 0.35), 0 0 160px rgba(0, 102, 255, 0.18)",
                        }}
                    />
                ) : (
                    <div
                        className="h-full w-full rounded-full"
                        style={{
                            background:
                                "radial-gradient(circle at 50% 50%, #FFF6D6 0%, #FFE08A 40%, rgba(255,213,107,0.6) 65%, transparent 80%)",
                            boxShadow:
                                "0 0 100px rgba(255, 224, 138, 0.7), 0 0 200px rgba(255, 200, 90, 0.35)",
                        }}
                    />
                )}
            </motion.div>
        </AnimatePresence>
    );
}

// ───────────────────────── Plane SVG ─────────────────────────

/**
 * Clean, minimal plane: lucide Plane icon, large + tinted per theme.
 * The lucide icon points up-right; we rotate -135° so the nose points
 * to the LEFT (Hebrew RTL flow). Subtle cyan thrust line trails to the right.
 */
function CleanPlane({ isDark }: { isDark: boolean }) {
    const tint = isDark ? "#E2E8F0" : "#0F172A";
    const trail = isDark ? "rgba(91,240,255,0.85)" : "rgba(14,165,233,0.55)";
    return (
        <div className="relative flex items-center justify-center">
            {/* Cyan jet trail (to the right of the nose-left plane) */}
            <span
                aria-hidden
                className="absolute right-[-120px] top-1/2 h-1 w-[160px] -translate-y-1/2 rounded-full blur-sm"
                style={{
                    background: `linear-gradient(to left, transparent 0%, ${trail} 60%, transparent 100%)`,
                }}
            />
            <Plane
                aria-hidden
                strokeWidth={1.4}
                className={isDark ? "drop-shadow-[0_20px_40px_rgba(0,229,255,0.35)]" : "drop-shadow-[0_20px_40px_rgba(15,23,42,0.18)]"}
                style={{
                    width: 220,
                    height: 220,
                    color: tint,
                    transform: "rotate(-135deg)",
                }}
            />
        </div>
    );
}

function PlaneSVG({ isDark }: { isDark: boolean }) {
    // Engine emissive much stronger in dark mode
    const trailOpacity = isDark ? 1 : 0.5;
    const trailWide = isDark ? 10 : 6;

    // Body palette: clean white/silver in day, deep navy in night
    const bodyTop = isDark ? "#1B2A52" : "#FFFFFF";
    const bodyMid = isDark ? "#0E1733" : "#F1F5FB";
    const bodyBot = isDark ? "#070C1F" : "#C9D6E6";
    const stripe = isDark ? "#5BF0FF" : "#102A6B";
    const outline = isDark ? "#000814" : "#1F2A4A";
    const cockpitDark = isDark ? "#021024" : "#0A1024";
    const cockpitLight = isDark ? "#5BF0FF" : "#9CC7FF";
    const windowFill = isDark ? "rgba(91,240,255,0.92)" : "rgba(10,16,36,0.85)";
    const rimColor = isDark ? "rgba(91,240,255,0.55)" : "rgba(255,236,180,0.85)";

    return (
        <svg
            width="520"
            height="240"
            viewBox="0 0 520 240"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={
                isDark
                    ? "drop-shadow-[0_28px_60px_rgba(0,229,255,0.4)]"
                    : "drop-shadow-[0_28px_50px_rgba(16,42,107,0.28)]"
            }
            aria-hidden
        >
            <defs>
                <linearGradient id="planeBody" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={bodyTop} />
                    <stop offset="55%" stopColor={bodyMid} />
                    <stop offset="100%" stopColor={bodyBot} />
                </linearGradient>
                <linearGradient id="planeWing" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={bodyMid} />
                    <stop offset="100%" stopColor={bodyBot} />
                </linearGradient>
                <linearGradient id="planeRim" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={rimColor} />
                    <stop offset="100%" stopColor={rimColor} stopOpacity="0" />
                </linearGradient>
                <linearGradient id="planeJet" x1="0" y1="0.5" x2="1" y2="0.5">
                    <stop offset="0%" stopColor="#5BF0FF" stopOpacity="0" />
                    <stop offset="55%" stopColor="#00E5FF" stopOpacity={isDark ? 0.95 : 0.55} />
                    <stop offset="100%" stopColor="#0066FF" stopOpacity="0" />
                </linearGradient>
                <radialGradient id="planeCockpit" cx="0.5" cy="0.5" r="0.6">
                    <stop offset="0%" stopColor={cockpitLight} />
                    <stop offset="100%" stopColor={cockpitDark} />
                </radialGradient>
            </defs>

            {/* Engine contrail */}
            <ellipse cx="80" cy="120" rx="170" ry={trailWide} fill="url(#planeJet)" opacity={trailOpacity} />
            <ellipse cx="60" cy="120" rx="110" ry={trailWide * 0.45} fill="url(#planeJet)" opacity={trailOpacity * 0.7} />

            {/* Tail fin */}
            <path
                d="M 175 120 L 215 60 L 240 65 L 245 120 Z"
                fill="url(#planeWing)"
                stroke={outline}
                strokeWidth="1.2"
                strokeLinejoin="round"
            />

            {/* Rear horizontal stabilizers */}
            <path
                d="M 200 118 L 250 92 L 270 95 L 235 122 Z"
                fill="url(#planeWing)"
                stroke={outline}
                strokeWidth="1"
                strokeLinejoin="round"
            />
            <path
                d="M 200 122 L 250 148 L 270 145 L 235 118 Z"
                fill="url(#planeWing)"
                stroke={outline}
                strokeWidth="1"
                strokeLinejoin="round"
            />

            {/* Main wings (perspective sweep back) */}
            <path
                d="M 245 120 L 195 178 L 240 184 L 320 124 Z"
                fill="url(#planeWing)"
                stroke={outline}
                strokeWidth="1.2"
                strokeLinejoin="round"
                opacity="0.95"
            />
            <path
                d="M 245 120 L 195 62 L 240 56 L 320 116 Z"
                fill="url(#planeWing)"
                stroke={outline}
                strokeWidth="1.2"
                strokeLinejoin="round"
                opacity="0.95"
            />

            {/* Fuselage */}
            <path
                d="M 130 120
           C 140 102, 200 92, 320 100
           C 400 106, 455 114, 478 120
           C 455 126, 400 134, 320 140
           C 200 148, 140 138, 130 120 Z"
                fill="url(#planeBody)"
                stroke={outline}
                strokeWidth="1.5"
                strokeLinejoin="round"
            />

            {/* Accent stripe along the side */}
            <path
                d="M 180 124 C 240 118, 360 118, 460 124"
                stroke={stripe}
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                opacity="0.85"
            />

            {/* Top rim light (sun warm / moon cool) */}
            <path
                d="M 160 110 C 220 100, 360 100, 460 112"
                stroke="url(#planeRim)"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
            />

            {/* Cockpit window */}
            <path
                d="M 442 116
           C 460 116, 472 119, 478 122
           C 472 124, 460 126, 446 126
           Z"
                fill="url(#planeCockpit)"
                stroke={outline}
                strokeWidth="1"
            />
            {/* Cockpit highlight */}
            <ellipse cx="455" cy="119" rx="6" ry="1.6" fill="rgba(255,255,255,0.7)" />

            {/* Passenger windows row */}
            <g fill={windowFill}>
                {Array.from({ length: 12 }).map((_, i) => (
                    <rect
                        key={i}
                        x={210 + i * 18}
                        y={117}
                        width={8}
                        height={4}
                        rx={1.5}
                    />
                ))}
            </g>

            {/* Engine pod under wing */}
            <ellipse
                cx="270"
                cy="148"
                rx="22"
                ry="7"
                fill="url(#planeWing)"
                stroke={outline}
                strokeWidth="1"
            />
            <circle cx="252" cy="148" r="3" fill={isDark ? "#5BF0FF" : "#1F2A4A"} />
        </svg>
    );
}

// ───────────────────────── Cloud layers ─────────────────────────

function CloudLayer({
    mvX,
    mvOpacity,
    depth,
    isDark,
}: {
    mvX: MotionValue<string>;
    mvOpacity: MotionValue<number>;
    depth: "back" | "mid" | "front";
    isDark: boolean;
}) {
    const config =
        depth === "back"
            ? { z: -20, blur: 22, base: isDark ? 0.18 : 0.55, items: BACK_CLOUDS }
            : depth === "mid"
                ? { z: -5, blur: 14, base: isDark ? 0.32 : 0.75, items: MID_CLOUDS }
                : { z: 5, blur: 8, base: isDark ? 0.55 : 0.9, items: FRONT_CLOUDS };

    // Day clouds: soft white. Night clouds: dark navy with cyan rim halo.
    const cloudBg = (depthKey: typeof depth) => {
        if (isDark) {
            return depthKey === "back"
                ? "radial-gradient(ellipse at 40% 50%, rgba(91,240,255,0.45) 0%, rgba(15,23,42,0.65) 35%, rgba(2,6,23,0.2) 70%, transparent 80%)"
                : depthKey === "mid"
                    ? "radial-gradient(ellipse at 50% 50%, rgba(120,170,220,0.55) 0%, rgba(15,23,42,0.55) 40%, transparent 80%)"
                    : "radial-gradient(ellipse at 50% 50%, rgba(180,210,255,0.65) 0%, rgba(15,23,42,0.4) 45%, transparent 80%)";
        }
        // Day
        return depthKey === "back"
            ? "radial-gradient(ellipse at 45% 55%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.45) 50%, transparent 80%)"
            : depthKey === "mid"
                ? "radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.95) 0%, rgba(235,245,255,0.55) 45%, transparent 80%)"
                : "radial-gradient(ellipse at 50% 50%, rgba(255,255,255,1) 0%, rgba(245,250,255,0.6) 40%, transparent 80%)";
    };

    return (
        <motion.div
            aria-hidden
            style={{ x: mvX, opacity: mvOpacity, zIndex: config.z }}
            className="pointer-events-none absolute inset-0 transition-opacity duration-700"
        >
            {config.items.map((c, i) => (
                <div
                    key={i}
                    className="absolute"
                    style={{
                        top: c.top,
                        left: c.left,
                        width: c.size,
                        height: c.size * 0.55,
                        opacity: config.base * c.o,
                        filter: `blur(${config.blur}px)`,
                        background: cloudBg(depth),
                    }}
                />
            ))}
        </motion.div>
    );
}

const BACK_CLOUDS = [
    { top: "12%", left: "8%", size: 360, o: 0.9 },
    { top: "28%", left: "62%", size: 420, o: 1 },
    { top: "55%", left: "18%", size: 320, o: 0.8 },
    { top: "70%", left: "70%", size: 380, o: 0.85 },
];
const MID_CLOUDS = [
    { top: "20%", left: "30%", size: 260, o: 0.95 },
    { top: "45%", left: "75%", size: 240, o: 0.85 },
    { top: "65%", left: "5%", size: 280, o: 1 },
];
const FRONT_CLOUDS = [
    { top: "8%", left: "55%", size: 200, o: 0.8 },
    { top: "75%", left: "30%", size: 240, o: 0.95 },
    { top: "40%", left: "-5%", size: 220, o: 0.7 },
];

function StarField() {
    const stars = Array.from({ length: 38 });
    return (
        <div aria-hidden className="absolute inset-0">
            {stars.map((_, i) => {
                const top = (i * 53) % 100;
                const left = (i * 37) % 100;
                const size = (i % 3) + 1;
                const delay = (i % 7) * 0.3;
                const cyan = i % 5 === 0;
                return (
                    <motion.span
                        key={i}
                        initial={{ opacity: 0.2 }}
                        animate={{ opacity: [0.2, 0.95, 0.2] }}
                        transition={{
                            duration: 3 + (i % 4),
                            repeat: Infinity,
                            delay,
                            ease: "easeInOut",
                        }}
                        style={{
                            top: `${top}%`,
                            left: `${left}%`,
                            width: size,
                            height: size,
                            background: cyan ? "#5BF0FF" : "#FFFFFF",
                            boxShadow: cyan
                                ? "0 0 8px rgba(91,240,255,0.85)"
                                : "0 0 4px rgba(255,255,255,0.7)",
                        }}
                        className="absolute rounded-full"
                    />
                );
            })}
        </div>
    );
}
