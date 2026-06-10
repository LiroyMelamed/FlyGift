"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { PrimaryButton, GhostButton } from "@/components/ui/Buttons";
import { cn } from "@/utils/cn";
import { Stepper } from "./Stepper";
import { StepRecipient } from "./StepRecipient";
import { StepAmount } from "./StepAmount";
import { StepReview } from "./StepReview";
import { StepSuccess } from "./StepSuccess";
import { DEFAULT_DRAFT, STEP_LABELS, type GiftDraft, type StepKey } from "./types";
import { useSendGift } from "@/hooks/useSendGift";
import { nativeBridge } from "@/utils/nativeBridge";
import { TopUpModal } from "@/components/wallet/TopUpModal";
import { recordTopUp } from "@/lib/appStore";

const ORDER: StepKey[] = ["recipient", "amount", "review", "success"];

const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

function validateStep(
    step: StepKey,
    draft: GiftDraft
): Partial<Record<keyof GiftDraft, string>> {
    const errs: Partial<Record<keyof GiftDraft, string>> = {};
    if (step === "recipient") {
        if (!draft.recipientName.trim()) errs.recipientName = "שדה חובה";
        if (!draft.recipientEmail.trim()) errs.recipientEmail = "שדה חובה";
        else if (!isValidEmail(draft.recipientEmail))
            errs.recipientEmail = "הזן כתובת דוא״ל תקינה";
    }
    if (step === "amount") {
        if (!draft.amount || draft.amount < 1)
            errs.amount = "סכום מינימאלי: $1";
        if (draft.amount > 10000) errs.amount = "סכום מקסימאלי: $10,000";
    }
    return errs;
}

export function SendGiftWizard() {
    const [step, setStep] = useState<StepKey>("recipient");
    const [draft, setDraft] = useState<GiftDraft>(DEFAULT_DRAFT);
    const [errors, setErrors] = useState<Partial<Record<keyof GiftDraft, string>>>(
        {}
    );
    const [topUp, setTopUp] = useState<{
        missingAmount: number;
        currency: string;
    } | null>(null);
    const { send, isLoading, result, error: sendError } = useSendGift();

    const idx = ORDER.indexOf(step);
    const labels = ORDER.slice(0, 3).map((k) => STEP_LABELS[k as Exclude<StepKey, "success">]);

    const submitGift = async () => {
        return send({
            recipientName: draft.recipientName,
            recipientEmail: draft.recipientEmail,
            message: draft.message,
            amount: draft.amount,
            currency: draft.currency,
            variant: draft.variant,
            category: draft.category,
            expirationDate: draft.expirationDate,
        });
    };

    const goNext = async () => {
        const e = validateStep(step, draft);
        if (Object.keys(e).length > 0) {
            setErrors(e);
            nativeBridge.haptic("error");
            return;
        }
        setErrors({});
        nativeBridge.haptic("light");

        if (step === "review") {
            const res = await submitGift();
            if (res.success) {
                setStep("success");
            } else if (res.needsTopUp) {
                // Open the payment popup instead of leaving the user
                // staring at a "balance not enough" message.
                setTopUp({
                    missingAmount: res.needsTopUp.missingAmount,
                    currency: res.needsTopUp.currency,
                });
                nativeBridge.haptic("warning");
            } else {
                nativeBridge.haptic("error");
            }
            return;
        }

        const next = ORDER[idx + 1];
        if (next) setStep(next);
    };

    const onTopUpSuccess = async ({ amount }: { amount: number; balance: number }) => {
        // Mirror the server-side credit into the local ledger so
        // selectWalletBalance() now covers the gift, then close the
        // modal and re-attempt the purchase automatically.
        recordTopUp({
            amount,
            currency: draft.currency,
            description: "טעינת ארנק",
        });
        setTopUp(null);
        const res = await submitGift();
        if (res.success) setStep("success");
        else nativeBridge.haptic("error");
    };

    const goBack = () => {
        nativeBridge.haptic("light");
        const prev = ORDER[idx - 1];
        if (prev) setStep(prev);
    };

    const reset = () => {
        setDraft(DEFAULT_DRAFT);
        setErrors({});
        setStep("recipient");
    };

    return (
        <div className="mx-auto max-w-xl space-y-6 py-6 text-center" dir="rtl">
            {step !== "success" && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-center"
                >
                    <Stepper steps={labels} current={idx} className="w-full max-w-sm mx-auto" />
                </motion.div>
            )}

            <GlassCard padding="lg" tone="elevated" className="overflow-hidden">
                <AnimatePresence mode="wait">
                    {step === "recipient" && (
                        <StepRecipient
                            key="recipient"
                            draft={draft}
                            setDraft={setDraft}
                            errors={errors}
                        />
                    )}
                    {step === "amount" && (
                        <StepAmount
                            key="amount"
                            draft={draft}
                            setDraft={setDraft}
                            errors={errors}
                        />
                    )}
                    {step === "review" && (
                        <StepReview
                            key="review"
                            draft={draft}
                            errorMessage={sendError ?? undefined}
                        />
                    )}
                    {step === "success" && (
                        <StepSuccess
                            key="success"
                            draft={draft}
                            code={result?.code}
                            onReset={reset}
                        />
                    )}
                </AnimatePresence>
            </GlassCard>

            {step !== "success" && (
                <div className="flex items-center justify-center gap-3">
                    {idx > 0 && (
                        <GhostButton type="button" onClick={goBack} disabled={isLoading}>
                            <ArrowRight className="h-4 w-4" />
                            חזרה
                        </GhostButton>
                    )}
                    <div className={cn(idx > 0 ? "flex-1" : "w-full max-w-xs mx-auto")}>
                        <PrimaryButton
                            type="button"
                            onClick={goNext}
                            loading={isLoading}
                            loadingText="מעבד תשלום…"
                        >
                            <span className="inline-flex items-center justify-center gap-2">
                                {step === "review" ? "אישור ושליחה" : "המשך"}
                                {step !== "review" && (
                                    <ArrowLeft className="h-4 w-4" />
                                )}
                            </span>
                        </PrimaryButton>
                    </div>
                </div>
            )}

            <TopUpModal
                open={!!topUp}
                onClose={() => setTopUp(null)}
                suggestedAmount={topUp?.missingAmount ?? 0}
                currency={topUp?.currency ?? draft.currency}
                onSuccess={onTopUpSuccess}
            />
        </div>
    );
}
