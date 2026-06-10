"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Wallet, X } from "lucide-react";
import { GhostButton, PrimaryButton } from "@/components/ui/Buttons";
import { TextField } from "@/components/ui/FormFields";
import { ApiUtils } from "@/utils/ApiUtils";
import { formatCurrencyDetailed } from "@/utils/format";
import { cn } from "@/utils/cn";

interface Props {
    open: boolean;
    onClose: () => void;
    /** Suggested top-up amount (e.g. the missing remainder). User can edit. */
    suggestedAmount: number;
    currency?: string;
    /** Called after a successful top-up so the parent can refresh + retry. */
    onSuccess?: (input: { amount: number; balance: number }) => void;
}

interface TopupEnvelope {
    success: boolean;
    response?: string;
    data?: {
        chargeId: string;
        brand?: string;
        last4?: string;
        balance: number;
        currency: string;
    };
}

const PRESETS = [50, 100, 250, 500, 1000];

/**
 * B2C wallet top-up. Charges a Stripe payment method via
 * `POST /api/Wallet/Topup` and then bubbles the new balance up to the
 * caller so they can retry the action that triggered the top-up
 * (e.g. resending a gift card the wallet couldn't previously cover).
 *
 * Test cards (when running against MockStripePaymentProvider):
 *  - "4242 4242 4242 4242" → succeeds
 *  - any "4000 ..." card    → declined
 */
export function TopUpModal({
    open,
    onClose,
    suggestedAmount,
    currency = "USD",
    onSuccess,
}: Props) {
    const [amount, setAmount] = useState<number>(0);
    const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState<{ amount: number; balance: number } | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // When the modal opens with a new suggested amount, initialize the
    // input. Round up to the nearest preset so the user usually only
    // pays one round-trip even if they need multiple gifts.
    useEffect(() => {
        if (!open) return;
        const rounded =
            PRESETS.find((p) => p >= suggestedAmount) ?? Math.ceil(suggestedAmount / 50) * 50;
        setAmount(Math.max(rounded, Math.ceil(suggestedAmount)));
        setError(null);
        setDone(null);
    }, [open, suggestedAmount]);

    const handleClose = () => {
        if (submitting) return;
        onClose();
    };

    const submit = async () => {
        if (amount <= 0) {
            setError("סכום הטעינה חייב להיות גדול מאפס.");
            return;
        }
        const digits = cardNumber.replace(/\s+/g, "");
        if (digits.length < 12) {
            setError("מספר כרטיס לא תקין.");
            return;
        }
        // Mock-stripe routing: any card starting 4000 is declined; everything
        // else succeeds. Real Stripe replaces this with an Elements token.
        const paymentMethodToken = digits.startsWith("4000") ? "pm_test_decline" : "pm_test_visa";

        setError(null);
        setSubmitting(true);
        try {
            const env = (await ApiUtils.post("Wallet/Topup", {
                amount,
                currency,
                paymentMethodToken,
            }).startRequest()) as TopupEnvelope;

            if (!env?.success || !env.data) {
                throw new Error(env?.response ?? "החיוב נכשל. נסו שוב.");
            }
            const result = { amount, balance: env.data.balance };
            setDone(result);
            onSuccess?.(result);
        } catch (e: unknown) {
            const err = e as {
                response?: { data?: { response?: string; message?: string } };
                message?: string;
            };
            setError(
                err?.response?.data?.response ??
                    err?.response?.data?.message ??
                    err?.message ??
                    "החיוב נכשל. נסו שוב.",
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleClose}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0F172A]/80 p-4 backdrop-blur-sm"
                    dir="rtl"
                >
                    <motion.div
                        initial={{ y: 16, opacity: 0, scale: 0.97 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 12, opacity: 0, scale: 0.97 }}
                        transition={{ type: "spring", stiffness: 320, damping: 28 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-md rounded-3xl border border-white/60 bg-white p-6 text-[#0D1B2A] shadow-[0_30px_80px_-20px_rgba(15,23,42,0.55)] sm:p-8 dark:border-white/10 dark:bg-[#0D1B2A] dark:text-text-primary"
                    >
                        <div className="space-y-5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gold-champagne/15">
                                        <Wallet className="h-4 w-4 text-gold-champagne" />
                                    </span>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-[0.2em] text-gold-champagne">
                                            ארנק FlyGift
                                        </p>
                                        <h2 className="font-display text-lg font-semibold">
                                            טעינת יתרה
                                        </h2>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    aria-label="סגירה"
                                    className="rounded-full p-1 text-text-secondary hover:bg-black/5 hover:text-text-primary dark:hover:bg-white/5"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {!done ? (
                                <>
                                    <p className="text-sm text-[#0F172A]/70 dark:text-text-secondary">
                                        נדרש{" "}
                                        <span className="font-semibold text-[#0D1B2A] dark:text-text-primary">
                                            {formatCurrencyDetailed(suggestedAmount, currency)}
                                        </span>{" "}
                                        כדי להמשיך. הטעינה מבוצעת מיידית בכרטיס אשראי.
                                    </p>

                                    <div className="grid grid-cols-5 gap-2">
                                        {PRESETS.map((p) => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => setAmount(p)}
                                                disabled={submitting}
                                                className={cn(
                                                    "rounded-xl border px-2 py-2 text-xs font-semibold transition-colors",
                                                    amount === p
                                                        ? "border-gold-champagne/60 bg-gold-champagne/15 text-gold-champagne"
                                                        : "border-[#0F172A]/10 bg-[#0F172A]/[0.03] text-[#0F172A]/70 hover:text-[#0D1B2A] dark:border-white/10 dark:bg-white/[0.03] dark:text-text-secondary dark:hover:text-text-primary",
                                                )}
                                            >
                                                ${p}
                                            </button>
                                        ))}
                                    </div>

                                    <TextField
                                        label="סכום ($)"
                                        type="number"
                                        min={1}
                                        max={1_000_000}
                                        value={amount || ""}
                                        onChange={(e) =>
                                            setAmount(Math.max(0, +e.target.value || 0))
                                        }
                                        disabled={submitting}
                                    />

                                    <TextField
                                        label="מספר כרטיס"
                                        inputMode="numeric"
                                        autoComplete="cc-number"
                                        value={cardNumber}
                                        onChange={(e) => setCardNumber(e.target.value)}
                                        disabled={submitting}
                                        dir="ltr"
                                    />

                                    {error && (
                                        <p
                                            role="alert"
                                            className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger"
                                        >
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
                                            onClick={submit}
                                            loading={submitting}
                                            loadingText="מחייבים…"
                                            disabled={amount <= 0}
                                        >
                                            <span className="inline-flex items-center gap-1.5">
                                                <Wallet className="h-4 w-4" />
                                                {`טעינה של $${amount.toFixed(2)}`}
                                            </span>
                                        </PrimaryButton>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2 text-sm font-semibold text-success">
                                        <CheckCircle2 className="h-5 w-5" />
                                        הטעינה הושלמה
                                    </div>
                                    <div className="space-y-2 rounded-2xl border border-[#0F172A]/10 bg-[#0F172A]/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]">
                                        <p className="text-xs text-[#0F172A]/60 dark:text-text-secondary">סכום שנטען</p>
                                        <p className="font-mono text-base font-semibold tabular-nums">
                                            {formatCurrencyDetailed(done.amount, currency)}
                                        </p>
                                        <p className="mt-2 text-xs text-[#0F172A]/60 dark:text-text-secondary">יתרה חדשה</p>
                                        <p className="font-mono text-base font-semibold tabular-nums">
                                            {formatCurrencyDetailed(done.balance, currency)}
                                        </p>
                                    </div>
                                    <div className="flex justify-end">
                                        <PrimaryButton type="button" onClick={onClose}>
                                            המשך
                                        </PrimaryButton>
                                    </div>
                                </>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body,
    );
}
