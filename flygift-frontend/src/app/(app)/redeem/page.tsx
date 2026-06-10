"use client";

import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { PrimaryButton } from "@/components/ui/Buttons";
import { ApiUtils } from "@/utils/ApiUtils";
import { nativeBridge } from "@/utils/nativeBridge";
import { formatCurrencyDetailed } from "@/utils/format";
import { t } from "@/i18n/he";

interface RedeemResponse {
    success?: boolean;
    Success?: boolean;
    response?: string;
    Response?: string;
    data?: { amount?: number; currency?: string };
    Data?: { amount?: number; currency?: string };
    giftCard?: { amount?: number; currency?: string };
    GiftCard?: { amount?: number; currency?: string };
}

export default function RedeemPage() {
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{ amount: number; currency: string } | null>(
        null
    );

    const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!code.trim()) {
            setError(t.redeem.invalid);
            nativeBridge.haptic("error");
            return;
        }
        setError(null);
        setLoading(true);
        try {
            const res = (await ApiUtils.post("GiftCard/Redeem", {
                code: code.trim().toUpperCase(),
                Code: code.trim().toUpperCase(),
            }).startRequest()) as RedeemResponse;

            const ok = res.success ?? res.Success;
            if (!ok) {
                const msg = res.response || res.Response || t.redeem.invalid;
                throw new Error(msg);
            }

            const data = (res.data ?? res.Data ?? {}) as { amount?: number; currency?: string };
            const gift = res.giftCard ?? res.GiftCard;
            setResult({
                amount: data.amount ?? gift?.amount ?? 0,
                currency: data.currency ?? gift?.currency ?? "USD",
            });
            nativeBridge.haptic("success");
        } catch (err) {
            nativeBridge.haptic("error");
            const msg =
                err instanceof Error && err.message
                    ? err.message
                    : t.redeem.invalid;
            // Axios wraps API errors — surface the Hebrew backend message.
            const api = err as {
                response?: { data?: { response?: string; Response?: string } };
            };
            setError(
                api?.response?.data?.response ||
                    api?.response?.data?.Response ||
                    msg,
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="py-8" dir="rtl">
            <div className="mx-auto max-w-md">
                <motion.header
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="mb-6 space-y-1"
                >
                    <h1 className="font-display text-2xl font-semibold">
                        <span className="text-gradient-skyline">{t.redeem.title}</span>
                    </h1>
                    <p className="text-sm text-text-secondary">{t.redeem.subtitle}</p>
                </motion.header>

                <GlassCard tone="elevated" padding="lg" glow="cyan">
                    <AnimatePresence mode="wait">
                        {result ? (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="space-y-4 py-4 text-center"
                            >
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/20 shadow-glow-success">
                                    <CheckCircle2
                                        className="h-8 w-8 text-success"
                                        strokeWidth={2.4}
                                    />
                                </div>
                                <p className="font-display text-lg font-semibold">
                                    <span className="text-gradient-skyline">
                                        {t.redeem.successTitle}
                                    </span>
                                </p>
                                <p className="text-sm text-text-secondary">
                                    {t.redeem.successBody(
                                        formatCurrencyDetailed(result.amount, result.currency)
                                    )}
                                </p>
                                <PrimaryButton
                                    type="button"
                                    onClick={() => {
                                        setResult(null);
                                        setCode("");
                                    }}
                                >
                                    {t.common.done}
                                </PrimaryButton>
                            </motion.div>
                        ) : (
                            <motion.form
                                key="form"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onSubmit={onSubmit}
                                noValidate
                                className="space-y-4"
                            >
                                <label className="block">
                                    <span className="mb-1 block text-xs text-text-secondary">
                                        {t.redeem.codeLabel}
                                    </span>
                                    <input
                                        type="text"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                                        placeholder={t.redeem.codePlaceholder}
                                        className="w-full rounded-xl border border-[#0F172A]/20 dark:border-white/10 bg-white/70 dark:bg-white/[0.03] px-3 py-3 text-center font-mono text-lg tracking-widest text-[#0F172A] dark:text-text-primary outline-none transition-colors focus:border-cyan-jet/60 focus:bg-white/90 dark:focus:bg-white/[0.06]"
                                    />
                                </label>

                                {error && (
                                    <p
                                        role="alert"
                                        className="rounded-xl border border-error/30 bg-error/10 px-3 py-2 text-xs text-error"
                                    >
                                        {error}
                                    </p>
                                )}

                                <PrimaryButton
                                    type="submit"
                                    loading={loading}
                                    loadingText={t.redeem.loading}
                                >
                                    {t.redeem.cta}
                                </PrimaryButton>
                            </motion.form>
                        )}
                    </AnimatePresence>
                </GlassCard>
            </div>
        </div>
    );
}
