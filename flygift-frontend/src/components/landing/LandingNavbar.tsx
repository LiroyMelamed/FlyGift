"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Plane, LogIn, Sparkles, Sun, Moon } from "lucide-react";
import { cn } from "@/utils/cn";
import { t } from "@/i18n/he";
import { useTheme } from "@/theme/ThemeProvider";
import { useLoginOverlay } from "./LoginOverlayContext";

export function LandingNavbar() {
    const { isDark, toggleTheme } = useTheme();
    const { open: openLogin } = useLoginOverlay();
    const { scrollY } = useScroll();
    const bgOpacity = useTransform(scrollY, [0, 120], [0, 0.7]);
    const blur = useTransform(scrollY, [0, 120], [0, 18]);
    const borderOpacity = useTransform(scrollY, [0, 120], [0, 0.08]);

    const bgColor = useTransform(bgOpacity, (o) =>
        isDark ? `rgba(5, 8, 20, ${o})` : `rgba(255, 255, 255, ${o * 0.85})`
    );
    const backdrop = useTransform(blur, (b) => `blur(${b}px)`);
    const borderColor = useTransform(borderOpacity, (o) =>
        isDark ? `rgba(255,255,255,${o})` : `rgba(10,16,36,${o})`
    );

    const [scrolled, setScrolled] = useState(false);
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 40);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <motion.header
            style={{
                backgroundColor: bgColor,
                backdropFilter: backdrop,
                WebkitBackdropFilter: backdrop,
                borderBottomColor: borderColor,
            }}
            className={cn(
                "fixed inset-x-0 top-0 z-50 border-b border-transparent transition-shadow duration-700",
                scrolled && "shadow-[0_8px_32px_-12px_rgba(0,0,0,0.35)]"
            )}
            dir="rtl"
        >
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
                {/* Right (RTL start): brand */}
                <Link
                    href="/"
                    className="group inline-flex items-center gap-2"
                    aria-label="FlyGift"
                >
                    <span className="btn-gold relative flex h-9 w-9 items-center justify-center rounded-xl">
                        <Plane className="h-4 w-4" strokeWidth={2.5} />
                    </span>
                    <span className="font-display text-lg font-semibold tracking-tight brand-glow">
                        FlyGift
                    </span>
                </Link>

                {/* Center: primary CTA */}
                <div className="hidden sm:flex">
                    <Link
                        href="/register"
                        className="btn-gold inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-semibold"
                    >
                        <Sparkles className="h-4 w-4" />
                        {t.landing.nav.getStarted}
                    </Link>
                </div>

                {/* Left (RTL end): theme toggle + Login */}
                <div className="inline-flex items-center gap-2">
                    <FlightThemeToggle isDark={isDark} onToggle={toggleTheme} />
                    <button
                        type="button"
                        onClick={openLogin}
                        className="inline-flex h-10 items-center gap-2 rounded-full border border-border-glass bg-bg-glass px-4 text-sm font-medium text-text-primary backdrop-blur-md transition-colors hover:opacity-90"
                    >
                        <LogIn className="h-4 w-4" />
                        <span>{t.landing.nav.login}</span>
                    </button>
                </div>
            </div>
        </motion.header>
    );
}

/** A small "flight" toggle: pressing rotates+fades between Sun and Moon. */
function FlightThemeToggle({
    isDark,
    onToggle,
}: {
    isDark: boolean;
    onToggle: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onToggle}
            aria-label={isDark ? "Switch to day flight" : "Switch to night flight"}
            className={cn(
                "relative inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border transition-colors",
                isDark
                    ? "border-cyan-jet/30 bg-white/[0.04] text-cyan-glow shadow-[0_0_18px_rgba(91,240,255,0.35)]"
                    : "border-[#0F172A]/30 bg-white/70 text-[#0F172A] shadow-[0_8px_24px_-8px_rgba(15,23,42,0.45)]"
            )}
        >
            <AnimatePresence mode="wait" initial={false}>
                {isDark ? (
                    <motion.span
                        key="moon"
                        initial={{ opacity: 0, rotate: -120, scale: 0.6 }}
                        animate={{ opacity: 1, rotate: 0, scale: 1 }}
                        exit={{ opacity: 0, rotate: 120, scale: 0.6 }}
                        transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
                        className="absolute inset-0 flex items-center justify-center"
                    >
                        <Moon className="h-4 w-4" strokeWidth={2.2} />
                    </motion.span>
                ) : (
                    <motion.span
                        key="sun"
                        initial={{ opacity: 0, rotate: 120, scale: 0.6 }}
                        animate={{ opacity: 1, rotate: 0, scale: 1 }}
                        exit={{ opacity: 0, rotate: -120, scale: 0.6 }}
                        transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
                        className="absolute inset-0 flex items-center justify-center"
                    >
                        <Sun className="h-4 w-4" strokeWidth={2.2} />
                    </motion.span>
                )}
            </AnimatePresence>
        </button>
    );
}
