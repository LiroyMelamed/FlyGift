"use client";

import { motion } from "framer-motion";
import { LuxuryGiftCard } from "@/components/giftcard/LuxuryGiftCard";
import { TextField } from "@/components/ui/FormFields";
import { cn } from "@/utils/cn";
import type { MockGiftCard } from "@/lib/mockData";
import type { GiftDraft } from "./types";

interface Props {
    draft: GiftDraft;
    setDraft: (next: GiftDraft) => void;
    errors: Partial<Record<keyof GiftDraft, string>>;
}

const PRESETS = [50, 100, 250, 500, 1000];

export function StepAmount({ draft, setDraft, errors }: Props) {
    const previewCard: MockGiftCard = {
        id: "preview",
        code: "FG-•••• ••••",
        amount: draft.amount || 0,
        currency: draft.currency,
        status: "Active",
        variant: draft.variant,
        category: draft.category,
        senderName: "You",
        recipientName: draft.recipientName || "Recipient",
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
                <h2 className="font-display text-xl font-semibold text-[#0F172A]">
                    בחירת סכום
                </h2>
                <p className="text-sm text-[#0F172A]/70">
                    התצוגה מתעדכנת בזמן אמת.
                </p>
            </header>

            {/* Live preview */}
            <div className="flex justify-center">
                <LuxuryGiftCard card={previewCard} interactive={false} className="w-full max-w-sm" />
            </div>

            {/* Amount */}
            <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-[#0F172A]/70 text-center">
                    סכום
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                    {PRESETS.map((p) => {
                        const active = draft.amount === p;
                        return (
                            <button
                                key={p}
                                type="button"
                                onClick={() => setDraft({ ...draft, amount: p })}
                                className={cn(
                                    "ring-focus rounded-xl px-4 py-2 text-sm font-semibold tabular-nums transition-all",
                                    active
                                        ? "bg-[#0F172A] text-white shadow-[0_8px_20px_-8px_rgba(15,23,42,0.6)]"
                                        : "bg-white border border-[#0F172A]/10 text-[#0F172A] hover:bg-[#0EA5E9]/5"
                                )}
                            >
                                ${p}
                            </button>
                        );
                    })}
                </div>
                <TextField
                    label="סכום מותאם אישית ($)"
                    type="number"
                    inputMode="decimal"
                    min={1}
                    step={1}
                    placeholder="250"
                    value={draft.amount || ""}
                    onChange={(e) =>
                        setDraft({ ...draft, amount: Number(e.target.value) || 0 })
                    }
                    error={errors.amount}
                />
            </div>
        </motion.div>
    );
}
