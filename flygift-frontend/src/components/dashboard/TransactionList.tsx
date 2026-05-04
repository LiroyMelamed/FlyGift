"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Gift, Plane, Hotel, CreditCard, RotateCcw, type LucideIcon } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/utils/cn";
import { formatCurrency, formatRelativeDate } from "@/utils/format";
import type { Transaction } from "@/lib/transactionTypes";
import { TX_SIGN } from "@/lib/transactionTypes";
import { t } from "@/i18n/he";

function pickIcon(tx: Transaction): LucideIcon {
    const ref = tx.transactionReference ?? "";
    if (ref.startsWith("giftcard:") || tx.relatedGiftCardId) return Gift;
    if (ref.includes("flight")) return Plane;
    if (ref.includes("hotel")) return Hotel;
    if (tx.type === "Refund") return RotateCcw;
    return CreditCard;
}

function pickTitle(tx: Transaction): string {
    if (tx.description) return tx.description;
    switch (tx.type) {
        case "Load":
            return "טעינה לארנק";
        case "Spend":
            return "תשלום";
        case "Refund":
            return "זיכוי";
        case "Adjustment":
            return "התאמה";
    }
}

export function TransactionList({ items }: { items: Transaction[] }) {
    const visible = items.slice(0, 5);
    return (
        <GlassCard padding="none" className="overflow-hidden" dir="rtl">
            <header className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                <h2 className="font-display text-base font-semibold">
                    {t.dashboard.recentActivity}
                </h2>
                <Link
                    href="/transactions"
                    className="text-xs text-text-secondary hover:text-text-primary transition-colors"
                >
                    {t.dashboard.viewAll}
                </Link>
            </header>

            {visible.length === 0 ? (
                <p className="px-5 py-6 text-sm text-text-secondary">
                    אין עדיין פעילות.
                </p>
            ) : (
                <ul className="divide-y divide-white/[0.04]">
                    {visible.map((tx, i) => {
                        const Icon = pickIcon(tx);
                        const sign = tx.isReversal ? -TX_SIGN[tx.type] : TX_SIGN[tx.type];
                        const isCredit = sign > 0;
                        return (
                            <motion.li
                                key={tx.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.04, duration: 0.3 }}
                                className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
                            >
                                <span
                                    className={cn(
                                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                                        isCredit
                                            ? "bg-success/10 text-success"
                                            : "bg-white/[0.06] text-text-secondary"
                                    )}
                                >
                                    <Icon className="h-4.5 w-4.5" />
                                </span>

                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-text-primary">
                                        {pickTitle(tx)}
                                    </p>
                                    <p className="truncate text-xs text-text-secondary">
                                        {formatRelativeDate(tx.createdAt)}
                                    </p>
                                </div>

                                <p
                                    className={cn(
                                        "font-mono text-sm font-semibold tabular-nums text-left",
                                        isCredit ? "text-success" : "text-text-primary"
                                    )}
                                    dir="ltr"
                                >
                                    {isCredit ? "+" : "−"}
                                    {formatCurrency(Math.abs(tx.amount), tx.currency)}
                                </p>
                            </motion.li>
                        );
                    })}
                </ul>
            )}
        </GlassCard>
    );
}
