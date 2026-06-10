"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { Sparkles, ArrowLeft, MousePointer2 } from "lucide-react";
import { LuxuryGiftCard } from "@/components/giftcard/LuxuryGiftCard";
import type { MockGiftCard } from "@/lib/mockData";
import { t } from "@/i18n/he";

// Static showcase card for the landing page. Not a real gift — the
// landing page renders before any user is logged in or any DB data
// exists, so we keep an inline fixture rather than fetching one.
const FEATURED_CARD: MockGiftCard = {
    id: "showcase",
    code: "FG-DEMO-CARD",
    amount: 750,
    currency: "ILS",
    status: "Active",
    variant: "gold-champagne",
    category: "Hotels",
    senderName: "FlyGift Rewards",
    recipientName: "לירוי מלמד",
    expirationDate: "2027-02-14T00:00:00Z",
    createdAt: "2026-03-01T18:05:00Z",
    message: "תיהנו מלינה יוקרתית על חשבוננו.",
};

export function StoryGiftCard() {
    const ref = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "end start"],
    });

    // Continuous gentle Y-rotation tied to scroll, plus a hover-tilt from GiftCard3D
    const rotate = useTransform(scrollYProgress, [0, 1], [-25, 25]);
    const y = useTransform(scrollYProgress, [0, 1], ["10%", "-10%"]);
    const float = useTransform(scrollYProgress, [0, 0.5, 1], [10, -10, 10]);

    const featuredCard = FEATURED_CARD;

    return (
        <section
            ref={ref}
            className="relative min-h-[100svh] overflow-hidden py-24"
            dir="rtl"
        >
            {/* Soft accent wash; global stars/clouds bleed through. */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10"
                style={{
                    background:
                        "radial-gradient(ellipse 70% 60% at 30% 30%, rgba(212,175,122,0.12) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 70%, rgba(124,92,255,0.14) 0%, transparent 60%)",
                }}
            />

            <motion.div
                style={{ y }}
                className="mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-2"
            >
                {/* Card showcase */}
                <div className="relative flex justify-center">
                    {/* Glow disc behind */}
                    <motion.div
                        animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.85, 0.5] }}
                        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                        aria-hidden
                        className="absolute inset-0 m-auto h-72 w-72 rounded-full blur-3xl opacity-60"
                        style={{
                            background:
                                "radial-gradient(circle, rgba(14,165,233,0.55) 0%, rgba(15,23,42,0.35) 60%, transparent 80%)",
                        }}
                    />
                    <motion.div
                        style={{ rotateY: rotate, y: float, transformPerspective: 1400 }}
                        className="relative w-full max-w-md"
                    >
                        <LuxuryGiftCard card={featuredCard} />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1, y: [0, -4, 0] }}
                        transition={{
                            opacity: { delay: 0.6, duration: 0.6 },
                            y: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
                        }}
                        className="absolute -bottom-2 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-bg-base/70 backdrop-blur-md px-3 py-1 text-[11px] text-text-secondary"
                    >
                        <MousePointer2 className="h-3 w-3 text-cyan-jet" />
                        {t.landing.story3.tip}
                    </motion.div>
                </div>

                {/* Text */}
                <div className="space-y-6 text-center lg:text-right">
                    <span className="inline-flex items-center gap-2 rounded-full border border-cyan-jet/40 bg-cyan-jet/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-cyan-glow backdrop-blur-md">
                        <Sparkles className="h-3 w-3" />
                        {t.landing.story3.kicker}
                    </span>
                    <h2 className="font-display text-4xl font-semibold leading-tight tracking-tight text-text-primary sm:text-5xl">
                        {t.landing.story3.title}
                    </h2>
                    <p className="text-base text-text-secondary sm:text-lg">
                        {t.landing.story3.body}
                    </p>
                    <div className="flex justify-center lg:justify-start">
                        <Link
                            href="/register"
                            className="btn-gold inline-flex h-12 items-center gap-2 rounded-full px-6 text-sm font-semibold transition-transform"
                        >
                            <Sparkles className="h-4 w-4" />
                            {t.landing.story3.cta}
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </motion.div>
        </section>
    );
}
