"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldCheck, CheckCircle2 } from "lucide-react";
import { PrimaryButton, GhostButton } from "@/components/ui/Buttons";
import { useRedeemGift } from "@/hooks/useRedeemGift";
import { nativeBridge } from "@/utils/nativeBridge";
import { formatCurrencyDetailed } from "@/utils/format";
import type { MockGiftCard } from "@/lib/mockData";

interface Props {
    open: boolean;
    card: MockGiftCard;
    onClose: () => void;
    onRedeemed: (redeemedAt: string) => void;
}

export function RedeemModal({ open, card, onClose, onRedeemed }: Props) {
    const { redeem, isLoading, result } = useRedeemGift();

    // Trap escape key
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    const handleRedeem = async () => {
        const res = await redeem(card.id);
        if (res.success) {
            // Long success haptic pattern
            nativeBridge.haptic("success");
            window.setTimeout(() => nativeBridge.haptic("heavy"), 120);
            window.setTimeout(() => nativeBridge.haptic("medium"), 280);
            onRedeemed(res.redeemedAt ?? new Date().toISOString());
        } else {
            nativeBridge.haptic("error");
        }
    };

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-[#0F172A]/40 backdrop-blur-md"
                        aria-hidden
                    />

                    {/* Sheet */}
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="redeem-title"
                        initial={{ opacity: 0, y: 30, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 30, scale: 0.96 }}
                        transition={{ type: "spring", stiffness: 320, damping: 30 }}
                        dir="rtl"
                        className="fixed inset-x-0 bottom-0 z-50 px-3 pb-safe sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-4"
                    >
                        <div className="mx-auto w-full max-w-md rounded-3xl border border-white/60 bg-white/90 p-6 text-[#0F172A] shadow-[0_30px_80px_-20px_rgba(15,23,42,0.45)] backdrop-blur-xl">
                            <div className="mb-4 flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0EA5E9]/15">
                                        <ShieldCheck className="h-5 w-5 text-[#0EA5E9]" />
                                    </div>
                                    <div>
                                        <h2
                                            id="redeem-title"
                                            className="font-display text-lg font-semibold text-[#0F172A]"
                                        >
                                            לממש את המתנה?
                                        </h2>
                                        <p className="text-xs text-[#0F172A]/70">
                                            לא ניתן לבטל פעולה זו.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    aria-label="סגירה"
                                    className="ring-focus inline-flex h-8 w-8 items-center justify-center rounded-full text-[#0F172A]/60 hover:text-[#0F172A] hover:bg-[#0F172A]/5 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {result?.success ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3 }}
                                    className="space-y-4 py-4 text-center"
                                >
                                    <motion.div
                                        initial={{ scale: 0, rotate: -45 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 260,
                                            damping: 18,
                                            delay: 0.05,
                                        }}
                                        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/20"
                                    >
                                        <CheckCircle2
                                            className="h-8 w-8 text-success"
                                            strokeWidth={2.4}
                                        />
                                    </motion.div>
                                    <div className="space-y-1">
                                        <p className="font-display text-lg font-semibold text-[#0F172A]">
                                            המימוש הושלם בהצלחה
                                        </p>
                                        <p className="text-sm text-[#0F172A]/70">
                                            {formatCurrencyDetailed(card.amount, card.currency)} נוספו ליתרת הנסיעות שלך.
                                        </p>
                                    </div>
                                    <PrimaryButton type="button" onClick={onClose}>
                                        להמשיך
                                    </PrimaryButton>
                                </motion.div>
                            ) : (
                                <>
                                    <div className="rounded-2xl bg-[#0F172A]/5 p-4">
                                        <div className="flex items-baseline justify-between">
                                            <span className="text-xs uppercase tracking-wider text-[#0F172A]/60">
                                                סכום
                                            </span>
                                            <span className="font-mono text-2xl font-semibold tabular-nums text-[#0F172A]" dir="ltr">
                                                {formatCurrencyDetailed(card.amount, card.currency)}
                                            </span>
                                        </div>
                                        <div className="mt-2 flex items-center justify-between">
                                            <span className="text-xs uppercase tracking-wider text-[#0F172A]/60">
                                                מאת
                                            </span>
                                            <span className="text-sm font-medium text-[#0F172A]">
                                                {card.senderName}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-5 space-y-2">
                                        <PrimaryButton
                                            type="button"
                                            onClick={handleRedeem}
                                            loading={isLoading}
                                            loadingText="מאמת מתנה…"
                                        >
                                            ממש עכשיו
                                        </PrimaryButton>
                                        <GhostButton
                                            type="button"
                                            onClick={onClose}
                                            className="w-full"
                                            disabled={isLoading}
                                        >
                                            לא עכשיו
                                        </GhostButton>
                                    </div>
                                </>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
