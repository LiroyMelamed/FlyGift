"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect } from "react";
import confetti from "canvas-confetti";
import { CheckCircle2, Send } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { PrimaryButton, GhostButton } from "@/components/ui/Buttons";
import { nativeBridge } from "@/utils/nativeBridge";
import { formatCurrencyDetailed } from "@/utils/format";
import type { GiftDraft } from "./types";

interface Props {
    draft: GiftDraft;
    code?: string;
    onReset: () => void;
}

export function StepSuccess({ draft, code, onReset }: Props) {
    useEffect(() => {
        nativeBridge.haptic("success");

        const fire = (origin: { x: number; y: number }) =>
            confetti({
                particleCount: 80,
                spread: 70,
                startVelocity: 45,
                origin,
                ticks: 200,
                colors: ["#00E5FF", "#7C5CFF", "#D4AF7A", "#FFFFFF"],
            });

        const id = window.setTimeout(() => {
            fire({ x: 0.2, y: 0.4 });
            fire({ x: 0.8, y: 0.4 });
            window.setTimeout(() => fire({ x: 0.5, y: 0.3 }), 250);
        }, 100);

        return () => window.clearTimeout(id);
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="space-y-6 text-center"
        >
            <motion.div
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
                className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/20 shadow-glow-success"
            >
                <CheckCircle2 className="h-10 w-10 text-success" strokeWidth={2.4} />
            </motion.div>

            <div className="space-y-2">
                <h2 className="font-display text-2xl font-semibold">
                    <span className="text-gradient-skyline">המתנה בדרך</span>
                </h2>
                <p className="text-sm text-[#0F172A]/70">
                    {draft.recipientName} יקבל/ת מייל בכתובת{" "}
                    <span className="text-[#0F172A] font-medium">{draft.recipientEmail}</span>.
                </p>
            </div>

            <GlassCard padding="md" className="text-right">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-[#0F172A]/60">
                            קוד הכרטיס
                        </p>
                        <p className="mt-1 font-mono text-base font-semibold tracking-wider text-[#0F172A]">
                            {code ?? "FG-XXXX-XXXX"}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider text-[#0F172A]/60">
                            סכום
                        </p>
                        <p className="mt-1 font-mono text-base font-semibold tabular-nums text-[#0F172A]">
                            {formatCurrencyDetailed(draft.amount, draft.currency)}
                        </p>
                    </div>
                </div>
            </GlassCard>

            <div className="space-y-2">
                <Link href="/dashboard" className="block">
                    <PrimaryButton type="button">חזרה למרכז השליטה</PrimaryButton>
                </Link>
                <GhostButton type="button" onClick={onReset} className="w-full">
                    <Send className="h-4 w-4" />
                    שליחת מתנה נוספת
                </GhostButton>
            </div>
        </motion.div>
    );
}
