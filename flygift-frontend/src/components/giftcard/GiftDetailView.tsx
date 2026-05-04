"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Calendar, User, Sparkles } from "lucide-react";
import { GiftCard3D } from "@/components/giftcard/GiftCard3D";
import { RevealCode } from "@/components/giftcard/RevealCode";
import { RedeemModal } from "@/components/giftcard/RedeemModal";
import { ShareToStoryButton } from "@/components/giftcard/ShareToStoryButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusPill } from "@/components/ui/StatusPill";
import { PrimaryButton, GhostButton } from "@/components/ui/Buttons";
import { CloudsBackground } from "@/components/ui/CloudsBackground";
import { formatExpiration, formatRelativeDate } from "@/utils/format";
import type { MockGiftCard } from "@/lib/mockData";
import { useAppStore, selectCardById } from "@/lib/appStore";

interface Props {
    initialCard: MockGiftCard;
}

const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    show: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: 0.05 + i * 0.07, duration: 0.4, ease: "easeOut" as const },
    }),
};

export function GiftDetailView({ initialCard }: Props) {
    // Live card from the store — falls back to the SSR `initialCard`
    // until the store hydrates so the first paint isn't blank.
    const liveCard = useAppStore((s) => selectCardById(initialCard.id, s));
    const card: MockGiftCard = liveCard ?? initialCard;
    const [showRedeem, setShowRedeem] = useState(false);

    const isFlight = card.category === "Flights";
    const canRedeem = card.status === "Active";

    const redeemCta = useMemo(() => {
        if (card.status === "Redeemed") return "מומש כבר";
        if (card.status === "Expired") return "תוקף המתנה פג";
        return "ממשו עכשיו";
    }, [card.status]);

    const handleRedeemed = (redeemedAt: string) => {
        // The store has already been mutated by useRedeemGift; nothing
        // else to do here — every consumer of the store re-renders.
        void redeemedAt;
    };

    return (
        <div className="relative" dir="rtl">
            {isFlight && <CloudsBackground />}

            <div className="relative mx-auto max-w-xl space-y-6 py-6">
                {/* Header */}
                <motion.div
                    custom={0}
                    initial="hidden"
                    animate="show"
                    variants={fadeUp}
                    className="flex items-center justify-between"
                >
                    <Link href="/dashboard">
                        <GhostButton type="button">
                            <ArrowLeft className="h-4 w-4 rotate-180" />
                            חזרה
                        </GhostButton>
                    </Link>
                    <StatusPill status={card.status} />
                </motion.div>

                {/* Hero card */}
                <motion.div
                    custom={1}
                    initial="hidden"
                    animate="show"
                    variants={fadeUp}
                    className="flex justify-center"
                >
                    <GiftCard3D card={card} className="w-full" />
                </motion.div>

                {/* Stage 18 — Share the Joy (Instagram Story) */}
                <motion.div
                    custom={1.5}
                    initial="hidden"
                    animate="show"
                    variants={fadeUp}
                >
                    <ShareToStoryButton card={card} companyName={card.senderName} />
                </motion.div>

                {/* Reveal code */}
                <motion.div custom={2} initial="hidden" animate="show" variants={fadeUp}>
                    <RevealCode
                        code={card.code}
                        initiallyRevealed={card.status !== "Active"}
                    />
                </motion.div>

                {/* Personal message */}
                {card.message && (
                    <motion.div custom={3} initial="hidden" animate="show" variants={fadeUp}>
                        <GlassCard padding="md" tone="elevated" className="relative mt-3 overflow-visible">
                            <div className="absolute -top-3 right-5 rounded-full bg-skyline-gradient px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-midnight-950 shadow-glow-cyan">
                                <span className="inline-flex items-center gap-1">
                                    <Sparkles className="h-3 w-3" />
                                    פתק אישי עבורך
                                </span>
                            </div>
                            <p className="pt-2 font-display text-lg italic leading-relaxed text-text-primary text-right">
                                ”{card.message}“
                            </p>
                            <p className="mt-3 text-xs text-text-secondary text-right">
                                — {card.senderName}
                            </p>
                        </GlassCard>
                    </motion.div>
                )}

                {/* Meta */}
                <motion.div custom={4} initial="hidden" animate="show" variants={fadeUp}>
                    <GlassCard padding="md" className="grid grid-cols-2 gap-4 text-sm text-right">
                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-text-secondary">
                                <User className="h-3 w-3" /> מאת
                            </div>
                            <p className="font-medium">{card.senderName}</p>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-text-secondary">
                                <Calendar className="h-3 w-3" /> נשלח
                            </div>
                            <p className="font-medium">{formatRelativeDate(card.createdAt)}</p>
                        </div>
                        <div className="space-y-1 col-span-2">
                            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-text-secondary">
                                <Calendar className="h-3 w-3" /> תקף עד
                            </div>
                            <p className="font-medium">{formatExpiration(card.expirationDate)}</p>
                        </div>
                    </GlassCard>
                </motion.div>

                {/* CTA */}
                <motion.div custom={5} initial="hidden" animate="show" variants={fadeUp}>
                    <PrimaryButton
                        type="button"
                        disabled={!canRedeem}
                        onClick={() => canRedeem && setShowRedeem(true)}
                    >
                        {redeemCta}
                    </PrimaryButton>
                    {!canRedeem && (
                        <p className="mt-2 text-center text-xs text-text-secondary">
                            {card.status === "Redeemed"
                                ? "מתנה זו כבר מומשה."
                                : "מתנה זו כבר לא בתוקף."}
                        </p>
                    )}
                </motion.div>
            </div>

            <RedeemModal
                open={showRedeem}
                card={card}
                onClose={() => setShowRedeem(false)}
                onRedeemed={handleRedeemed}
            />
        </div>
    );
}
