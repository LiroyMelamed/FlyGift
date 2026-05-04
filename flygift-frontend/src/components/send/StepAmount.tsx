"use client";

import { motion } from "framer-motion";
import { Plane, Hotel, Sparkles, type LucideIcon } from "lucide-react";
import { GiftCard3D } from "@/components/giftcard/GiftCard3D";
import { TextField } from "@/components/ui/FormFields";
import { cn } from "@/utils/cn";
import type { GiftCardVariant, MockGiftCard } from "@/lib/mockData";
import type { GiftDraft } from "./types";

interface Props {
    draft: GiftDraft;
    setDraft: (next: GiftDraft) => void;
    errors: Partial<Record<keyof GiftDraft, string>>;
}

const PRESETS = [50, 100, 250, 500, 1000];

const VARIANT_OPTIONS: Array<{
    variant: GiftCardVariant;
    category: MockGiftCard["category"];
    label: string;
    categoryLabel: string;
    icon: LucideIcon;
    swatch: string;
}> = [
        {
            variant: "cyan-jet",
            category: "Flights",
            label: "סיאן ג'ט",
            categoryLabel: "טיסות",
            icon: Plane,
            swatch:
                "linear-gradient(135deg, #0066FF 0%, #00E5FF 60%, #5BF0FF 100%)",
        },
        {
            variant: "gold-champagne",
            category: "Hotels",
            label: "גולד שמפן",
            categoryLabel: "מלונות",
            icon: Hotel,
            swatch:
                "linear-gradient(135deg, #4A2E0A 0%, #B7894C 55%, #D4AF7A 100%)",
        },
        {
            variant: "violet-aurora",
            category: "Travel",
            label: "ויולט אורורה",
            categoryLabel: "טיולים",
            icon: Sparkles,
            swatch:
                "linear-gradient(135deg, #3A1E8A 0%, #7C5CFF 55%, #B89CFF 100%)",
        },
    ];

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
                    בחירת סכום ועיצוב
                </h2>
                <p className="text-sm text-[#0F172A]/70">
                    התצוגה מתעדכנת בזמן אמת.
                </p>
            </header>

            {/* Live preview */}
            <div className="flex justify-center">
                <GiftCard3D card={previewCard} className="w-full max-w-sm" />
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
                                ₪{p}
                            </button>
                        );
                    })}
                </div>
                <TextField
                    label="סכום מותאם אישית (₪)"
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

            {/* Theme picker */}
            <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-[#0F172A]/70 text-center">
                    עיצוב הכרטיס
                </p>
                <div className="grid grid-cols-3 gap-2">
                    {VARIANT_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        const active = draft.variant === opt.variant;
                        return (
                            <motion.button
                                key={opt.variant}
                                whileTap={{ scale: 0.97 }}
                                type="button"
                                onClick={() =>
                                    setDraft({
                                        ...draft,
                                        variant: opt.variant,
                                        category: opt.category,
                                    })
                                }
                                className={cn(
                                    "ring-focus relative overflow-hidden rounded-2xl p-3 text-left transition-all",
                                    active
                                        ? "border-2 border-cyan-jet shadow-glow-cyan"
                                        : "border border-white/10 hover:border-white/20"
                                )}
                            >
                                <div
                                    aria-hidden
                                    className="mb-3 h-12 w-full rounded-lg"
                                    style={{ background: opt.swatch }}
                                />
                                <div className="flex items-center gap-1.5">
                                    <Icon className="h-3.5 w-3.5 text-text-secondary" />
                                    <p className="text-xs font-semibold text-text-primary">
                                        {opt.label}
                                    </p>
                                </div>
                                <p className="mt-0.5 text-[10px] text-text-secondary">
                                    {opt.categoryLabel}
                                </p>
                            </motion.button>
                        );
                    })}
                </div>
            </div>
        </motion.div>
    );
}
