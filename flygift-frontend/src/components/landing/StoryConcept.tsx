"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
    Sparkles,
    MapPinned,
    CreditCard,
    Send,
    type LucideIcon,
} from "lucide-react";
import { t } from "@/i18n/he";
import { useTheme } from "@/theme/ThemeProvider";

/**
 * Stage 22 — Clear, professional "How It Works" section.
 * Replaces the ambiguous floating-orbs visual with three explicit steps.
 */
export function StoryConcept() {
    const ref = useRef<HTMLDivElement>(null);
    const { isDark } = useTheme();
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "end start"],
    });
    const y = useTransform(scrollYProgress, [0, 1], ["6%", "-6%"]);

    const steps: { icon: LucideIcon; title: string; body: string }[] = [
        {
            icon: MapPinned,
            title: "בחרו יעד",
            body: "סניף, ערים פופולריות או הפתעה מלאה — אתם מחליטים עד כמה לכוון את המתנה.",
        },
        {
            icon: CreditCard,
            title: "טענו סכום",
            body: "כל סכום, כל מטבע. מתנת FlyGift שווה כסף אמיתי לטיסות ולמלונות מובילים.",
        },
        {
            icon: Send,
            title: "שלחו דיגיטלית",
            body: "כרטיס אישי בעיצוב מרהיב נשלח במייל / וואטסאפ — מוכן לפדיון מיידי.",
        },
    ];

    const sectionAccent = isDark
        ? "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(124,92,255,0.18) 0%, transparent 60%)"
        : "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(14,165,233,0.10) 0%, transparent 60%)";

    const headingColor = isDark ? "text-white" : "text-[#0F172A]";
    const bodyColor = isDark ? "text-slate-300" : "text-slate-600";
    const cardClass = isDark
        ? "group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-7 backdrop-blur-md shadow-[0_20px_50px_-25px_rgba(0,229,255,0.25)] transition-all hover:-translate-y-1 hover:border-cyan-jet/40 hover:shadow-[0_30px_60px_-25px_rgba(0,229,255,0.4)]"
        : "group relative overflow-hidden rounded-3xl border border-[#0F172A]/10 bg-white/70 p-7 backdrop-blur shadow-[0_20px_50px_-25px_rgba(15,23,42,0.2)] transition-all hover:-translate-y-1 hover:border-[#0EA5E9]/40 hover:shadow-[0_30px_60px_-25px_rgba(14,165,233,0.35)]";
    const iconWell = isDark
        ? "inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-jet/15 text-cyan-jet"
        : "inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0F172A] text-white";
    const stepNumColor = isDark ? "text-cyan-jet" : "text-[#0EA5E9]";
    const bulletWrap = isDark
        ? "flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur"
        : "flex items-start gap-3 rounded-2xl border border-[#0F172A]/8 bg-white/70 px-4 py-3 backdrop-blur";
    const bulletText = isDark ? "text-white/90" : "text-[#0F172A]";
    const kickerClass =
        "inline-flex items-center gap-2 rounded-full border border-cyan-deep/30 bg-cyan-deep/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-cyan-deep backdrop-blur-md dark:border-cyan-jet/40 dark:bg-cyan-jet/10 dark:text-cyan-glow";

    return (
        <section
            ref={ref}
            dir="rtl"
            className="relative min-h-[100svh] overflow-hidden py-24"
        >
            {/* Transparent accent layer — global stars/clouds show through. */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10"
                style={{ background: sectionAccent }}
            />
            <motion.div
                style={{ y }}
                className="mx-auto w-full max-w-screen-xl px-6"
            >
                <header className="mx-auto max-w-2xl space-y-3 text-center">
                    <span className={kickerClass}>
                        <Sparkles className="h-3 w-3" />
                        {t.landing.story1.kicker}
                    </span>
                    <h2 className={`font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl ${headingColor}`}>
                        {t.landing.story1.title}
                    </h2>
                    <p className={`text-base sm:text-lg ${bodyColor}`}>
                        {t.landing.story1.body}
                    </p>
                </header>

                <ol className="mt-14 grid gap-6 md:grid-cols-3">
                    {steps.map((step, i) => (
                        <motion.li
                            key={step.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-80px" }}
                            transition={{
                                duration: 0.5,
                                delay: i * 0.1,
                                ease: [0.22, 1, 0.36, 1],
                            }}
                            className={cardClass}
                        >
                            <span
                                aria-hidden
                                className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-[#0EA5E9]/10 blur-2xl transition-opacity group-hover:opacity-80"
                            />

                            <div className="mb-4 flex items-center justify-between">
                                <span className={iconWell}>
                                    <step.icon className="h-5 w-5" />
                                </span>
                                <span className={`font-mono text-xl font-semibold tabular-nums ${stepNumColor}`}>
                                    0{i + 1}
                                </span>
                            </div>

                            <h3 className={`font-display text-lg font-semibold ${headingColor}`}>
                                {step.title}
                            </h3>
                            <p className={`mt-2 text-sm leading-relaxed ${bodyColor}`}>
                                {step.body}
                            </p>
                        </motion.li>
                    ))}
                </ol>

                {/* Bullet recap */}
                <ul className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-2">
                    {t.landing.story1.bullets.map((b) => (
                        <li key={b} className={bulletWrap}>
                            <span className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[#0EA5E9]/15 text-[#0369A1] ring-1 ring-[#0EA5E9]/40">
                                <Sparkles className="h-3 w-3" />
                            </span>
                            <span className={`text-sm ${bulletText}`}>{b}</span>
                        </li>
                    ))}
                </ul>
            </motion.div>
        </section>
    );
}
