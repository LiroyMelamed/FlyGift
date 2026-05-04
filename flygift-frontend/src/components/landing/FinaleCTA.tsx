"use client";

import Link from "next/link";
import { Plane, Sparkles, ArrowLeft } from "lucide-react";
import { t } from "@/i18n/he";
import { useLoginOverlay } from "./LoginOverlayContext";

export function FinaleCTA() {
    const { open } = useLoginOverlay();
    return (
        <section className="relative overflow-hidden py-28" dir="rtl">
            {/* Soft accent wash; global stars/clouds bleed through. */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10"
                style={{
                    background:
                        "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(30,58,138,0.16) 0%, transparent 70%)",
                }}
            />
            <div className="mx-auto max-w-3xl space-y-6 px-6 text-center">
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-deep/30 bg-cyan-deep/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-cyan-deep backdrop-blur-md dark:border-cyan-jet/40 dark:bg-cyan-jet/10 dark:text-cyan-glow">
                    <Sparkles className="h-3 w-3" />
                    {t.landing.finale.kicker}
                </span>
                <h2 className="font-display text-4xl font-semibold leading-tight tracking-tight text-text-primary sm:text-5xl">
                    {t.landing.finale.title}
                </h2>
                <p className="text-base text-text-secondary sm:text-lg">
                    {t.landing.finale.body}
                </p>
                <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <Link
                        href="/register"
                        className="btn-gold inline-flex h-12 items-center gap-2 rounded-full px-7 text-sm font-semibold"
                    >
                        <Plane className="h-4 w-4" />
                        {t.landing.finale.ctaPrimary}
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <button
                        type="button"
                        onClick={open}
                        className="inline-flex h-12 items-center justify-center rounded-full border border-border-glass bg-bg-glass px-7 text-sm font-medium text-text-primary backdrop-blur-md transition-colors hover:opacity-90"
                    >
                        {t.landing.finale.ctaSecondary}
                    </button>
                </div>
            </div>
        </section>
    );
}
