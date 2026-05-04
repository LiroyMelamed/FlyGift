"use client";

import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/GlassCard";
import { GiftCard3D } from "@/components/giftcard/GiftCard3D";
import { formatCurrencyDetailed, formatExpiration } from "@/utils/format";
import type { MockGiftCard } from "@/lib/mockData";
import type { GiftDraft } from "./types";

interface Props {
    draft: GiftDraft;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-baseline justify-between gap-4 py-2.5">
            <span className="text-xs uppercase tracking-wider text-text-secondary">
                {label}
            </span>
            <span className="text-sm font-medium text-text-primary text-right">
                {value}
            </span>
        </div>
    );
}

export function StepReview({ draft }: Props) {
    const previewCard: MockGiftCard = {
        id: "preview",
        code: "FG-•••• ••••",
        amount: draft.amount,
        currency: draft.currency,
        status: "Active",
        variant: draft.variant,
        category: draft.category,
        senderName: "You",
        recipientName: draft.recipientName,
        expirationDate: draft.expirationDate,
        createdAt: new Date().toISOString(),
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
        >
            <header className="space-y-1 text-center">
                <h2 className="font-display text-xl font-semibold text-[#0F172A]">כמעט סיימנו</h2>
                <p className="text-sm text-[#0F172A]/70">
                    בדקו את הפרטים לפני השליחה.
                </p>
            </header>

            <div className="flex justify-center">
                <GiftCard3D card={previewCard} className="w-full max-w-sm" />
            </div>

            <GlassCard padding="md" className="divide-y divide-[#0F172A]/10">
                <Row label="מקבל/ת" value={draft.recipientName} />
                <Row label="דוא״ל" value={draft.recipientEmail} />
                <Row
                    label="סכום"
                    value={
                        <span className="font-mono tabular-nums">
                            {formatCurrencyDetailed(draft.amount, draft.currency)}
                        </span>
                    }
                />
                <Row label="עיצוב" value={draft.category} />
                <Row label="תקף עד" value={formatExpiration(draft.expirationDate)} />
                {draft.message && (
                    <Row
                        label="הודעה"
                        value={
                            <span className="italic text-[#0F172A]/70">
                                ”{draft.message}“
                            </span>
                        }
                    />
                )}
            </GlassCard>

            <p className="text-center text-xs text-[#0F172A]/60">
                באישור אתם מאשרים את תנאי השימוש של FlyGift.
            </p>
        </motion.div>
    );
}
