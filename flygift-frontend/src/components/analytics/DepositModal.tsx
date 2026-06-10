"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Wallet, ExternalLink, CheckCircle2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { PrimaryButton, GhostButton } from "@/components/ui/Buttons";
import { TextField } from "@/components/ui/FormFields";
import { ApiUtils } from "@/utils/ApiUtils";
import { formatCurrencyDetailed } from "@/utils/format";

interface Props {
    open: boolean;
    onClose: () => void;
    /** Optional: parent can react when an invoice is generated. */
    onSuccess?: () => void;
}

interface DepositResult {
    success: boolean;
    invoiceNumber: string;
    url: string;
    issuedAt: string;
    total: number;
    currency: string;
}

interface DepositEnvelope {
    success: boolean;
    response?: string;
    data?: DepositResult;
}

const PRESETS = [500, 1000, 2500, 5000];

/**
 * 'טעינת יתרה' modal. Calls POST /api/Company/Billing/Deposit and surfaces
 * the generated invoice/payment-request URL the company sends to finance.
 * Uses the brand 'Midnight Blue + Gold' tokens (--bg-elevated, gold-champagne).
 */
export function DepositModal({ open, onClose, onSuccess }: Props) {
    const [amount, setAmount] = useState<number>(1000);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<DepositResult | null>(null);

    const reset = () => {
        setAmount(1000);
        setError(null);
        setResult(null);
        setSubmitting(false);
    };

    const handleClose = () => {
        onClose();
        // Defer the field reset so the modal animates out cleanly.
        window.setTimeout(reset, 250);
    };

    const onSubmit = async () => {
        if (amount <= 0) {
            setError("סכום הטעינה חייב להיות גדול מאפס.");
            return;
        }
        setError(null);
        setSubmitting(true);
        try {
            const env = (await ApiUtils.post("Company/Billing/Deposit", {
                amount,
                currency: "USD",
            }).startRequest()) as DepositEnvelope;
            if (!env?.success || !env.data) {
                throw new Error(env?.response ?? "הפקת החשבונית נכשלה.");
            }
            setResult(env.data);
            onSuccess?.();
        } catch (e: unknown) {
            const err = e as {
                response?: { data?: { response?: string; message?: string } };
                message?: string;
            };
            setError(
                err?.response?.data?.response ??
                    err?.response?.data?.message ??
                    err?.message ??
                    "הפקת החשבונית נכשלה.",
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleClose}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/70 backdrop-blur-md p-4"
                    dir="rtl"
                >
                    <motion.div
                        initial={{ y: 16, opacity: 0, scale: 0.97 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 12, opacity: 0, scale: 0.97 }}
                        transition={{ type: "spring", stiffness: 320, damping: 28 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-md"
                    >
                        <GlassCard
                            padding="lg"
                            tone="elevated"
                            glow="cyan"
                            className="space-y-5 border-gold-champagne/20"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gold-champagne/15">
                                        <Wallet className="h-4.5 w-4.5 text-gold-champagne" />
                                    </span>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-[0.2em] text-gold-champagne">
                                            אזור החברה
                                        </p>
                                        <h2 className="font-display text-lg font-semibold text-text-primary">
                                            טעינת יתרה
                                        </h2>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    aria-label="סגירה"
                                    className="rounded-full p-1 text-text-secondary hover:bg-white/5 hover:text-text-primary"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {!result ? (
                                <>
                                    <p className="text-sm text-text-secondary">
                                        בחרו סכום לטעינה. תופק חשבונית/בקשת תשלום
                                        וקישור להורדה ישלח גם לדוא״ל החברה.
                                    </p>

                                    <div className="grid grid-cols-4 gap-2">
                                        {PRESETS.map((p) => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => setAmount(p)}
                                                className={`rounded-xl border px-2 py-2 text-xs font-semibold transition-colors ${
                                                    amount === p
                                                        ? "border-gold-champagne/60 bg-gold-champagne/15 text-gold-champagne"
                                                        : "border-white/10 bg-white/[0.03] text-text-secondary hover:text-text-primary"
                                                }`}
                                            >
                                                {formatCurrencyDetailed(p, "USD")}
                                            </button>
                                        ))}
                                    </div>

                                    <TextField
                                        label="סכום מותאם (USD)"
                                        type="number"
                                        min={1}
                                        max={1_000_000}
                                        value={amount}
                                        onChange={(e) =>
                                            setAmount(Math.max(0, +e.target.value || 0))
                                        }
                                    />

                                    {error && (
                                        <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                                            {error}
                                        </p>
                                    )}

                                    <div className="flex items-center justify-end gap-2">
                                        <GhostButton
                                            type="button"
                                            onClick={handleClose}
                                            disabled={submitting}
                                        >
                                            ביטול
                                        </GhostButton>
                                        <PrimaryButton
                                            type="button"
                                            onClick={onSubmit}
                                            loading={submitting}
                                            loadingText="מפיקים…"
                                            disabled={amount <= 0}
                                        >
                                            הפקת חשבונית
                                        </PrimaryButton>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2 text-sm font-semibold text-success">
                                        <CheckCircle2 className="h-5 w-5" />
                                        החשבונית הופקה
                                    </div>
                                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
                                        <p className="text-xs text-text-secondary">
                                            מס׳ חשבונית
                                        </p>
                                        <p className="font-mono text-base font-semibold text-text-primary tabular-nums" dir="ltr">
                                            {result.invoiceNumber}
                                        </p>
                                        <p className="text-xs text-text-secondary mt-2">סכום</p>
                                        <p className="font-mono text-base font-semibold text-text-primary tabular-nums">
                                            {formatCurrencyDetailed(result.total, result.currency)}
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <a
                                            href={result.url}
                                            target="_blank"
                                            rel="noreferrer noopener"
                                            className="inline-flex items-center gap-1.5 rounded-full border border-cyan-jet/40 bg-cyan-jet/10 px-3 py-1.5 text-[12px] font-semibold text-cyan-jet transition-colors hover:bg-cyan-jet/20"
                                        >
                                            פתיחת PDF
                                            <ExternalLink className="h-3 w-3" />
                                        </a>
                                        <PrimaryButton type="button" onClick={handleClose}>
                                            סגירה
                                        </PrimaryButton>
                                    </div>
                                </>
                            )}
                        </GlassCard>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
