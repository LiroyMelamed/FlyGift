"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
    ArrowDownLeft,
    ArrowUpRight,
    RotateCcw,
    Search,
    Sparkles,
    Receipt,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { formatCurrencyDetailed } from "@/utils/format";
import { searchTransactions } from "@/lib/mockTransactions";
import { useAppStore } from "@/lib/appStore";
import type { Transaction, TransactionType } from "@/lib/transactionTypes";
import { TX_SIGN } from "@/lib/transactionTypes";
import { cn } from "@/utils/cn";
import { t as i18n } from "@/i18n/he";

type TxCategory =
    | "all"
    | "received"
    | "sent"
    | "flight"
    | "hotel"
    | "other";

/**
 * Categorize a single ledger entry by inspecting transactionReference
 * prefixes and relatedGiftCardId. Mirrors the booking write paths:
 *   - giftcard:* / relatedGiftCardId  → received gift
 *   - gift:*                          → sent gift
 *   - booking:flight-*                → flight booking
 *   - booking:hotel-*                 → hotel booking
 */
function categorize(tx: Transaction): TxCategory {
    const ref = tx.transactionReference ?? "";
    if (ref.startsWith("booking:flight")) return "flight";
    if (ref.startsWith("booking:hotel")) return "hotel";
    if (ref.startsWith("gift:")) return "sent";
    if (ref.startsWith("giftcard:") || tx.relatedGiftCardId) return "received";
    return "other";
}

const ICONS: Record<TransactionType, React.ReactNode> = {
    Load: <ArrowDownLeft className="h-4 w-4" />,
    Spend: <ArrowUpRight className="h-4 w-4" />,
    Refund: <RotateCcw className="h-4 w-4" />,
    Adjustment: <Sparkles className="h-4 w-4" />,
};

const TONES: Record<TransactionType, string> = {
    Load: "bg-success/10 text-success border-success/30",
    Refund: "bg-cyan-jet/10 text-cyan-jet border-cyan-jet/30",
    Adjustment: "bg-violet-aurora/10 text-violet-aurora border-violet-aurora/30",
    Spend: "bg-warning/10 text-warning border-warning/30",
};

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

/**
 * Stage 16 — Transaction History (immutable ledger view).
 * Replace MOCK_TRANSACTIONS with `ApiUtils.get('Transaction/Mine')`
 * once the backend is reachable; payload shape matches `Transaction`.
 */
export function TransactionHistoryView() {
    const [q, setQ] = useState("");
    const [category, setCategory] = useState<TxCategory>("all");
    const allTransactions = useAppStore((s) => s.transactions);

    // Counts per category drive the chip badges
    const categoryCounts = useMemo(() => {
        const counts: Record<TxCategory, number> = {
            all: allTransactions.length,
            received: 0,
            sent: 0,
            flight: 0,
            hotel: 0,
            other: 0,
        };
        for (const tx of allTransactions) counts[categorize(tx)]++;
        return counts;
    }, [allTransactions]);

    // Apply category first, then text search
    const items = useMemo(() => {
        const filtered =
            category === "all"
                ? allTransactions
                : allTransactions.filter((tx) => categorize(tx) === category);
        return searchTransactions(filtered, q);
    }, [allTransactions, category, q]);

    const totals = useMemo(() => {
        let credits = 0;
        let debits = 0;
        for (const t of allTransactions) {
            const sign = t.isReversal ? -TX_SIGN[t.type] : TX_SIGN[t.type];
            if (sign > 0) credits += t.amount;
            else debits += t.amount;
        }
        return { credits, debits, net: credits - debits };
    }, [allTransactions]);

    const currency = allTransactions[0]?.currency ?? "ILS";

    const categoryChips: { value: TxCategory; label: string }[] = [
        { value: "all", label: i18n.transactions.categoryAll },
        { value: "received", label: i18n.transactions.categoryReceived },
        { value: "sent", label: i18n.transactions.categorySent },
        { value: "flight", label: i18n.transactions.categoryFlight },
        { value: "hotel", label: i18n.transactions.categoryHotel },
        { value: "other", label: i18n.transactions.categoryOther },
    ];

    return (
        <div className="space-y-4" dir="rtl">
            {/* KPI strip */}
            <div className="grid grid-cols-3 gap-3">
                <GlassCard padding="md" tone="elevated">
                    <p className="text-[10px] uppercase tracking-wider text-text-secondary">
                        {i18n.transactions.income}
                    </p>
                    <p className="mt-1 font-mono text-lg font-semibold text-success tabular-nums">
                        +{formatCurrencyDetailed(totals.credits, currency)}
                    </p>
                </GlassCard>
                <GlassCard padding="md" tone="elevated">
                    <p className="text-[10px] uppercase tracking-wider text-text-secondary">
                        {i18n.transactions.expenses}
                    </p>
                    <p className="mt-1 font-mono text-lg font-semibold text-warning tabular-nums">
                        −{formatCurrencyDetailed(totals.debits, currency)}
                    </p>
                </GlassCard>
                <GlassCard padding="md" tone="elevated">
                    <p className="text-[10px] uppercase tracking-wider text-text-secondary">
                        {i18n.transactions.balance}
                    </p>
                    <p className="mt-1 font-mono text-lg font-semibold text-text-primary tabular-nums">
                        {formatCurrencyDetailed(totals.net, currency)}
                    </p>
                </GlassCard>
            </div>

            {/* Category chips */}
            <div
                className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin"
                role="tablist"
                aria-label="Transaction categories"
            >
                {categoryChips.map((c) => {
                    const active = category === c.value;
                    const count = categoryCounts[c.value];
                    return (
                        <button
                            key={c.value}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => setCategory(c.value)}
                            className={cn(
                                "ring-focus inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-xs font-medium transition-colors",
                                active
                                    ? "border-cyan-deep/40 bg-cyan-deep/10 text-cyan-deep dark:border-cyan-jet/40 dark:bg-cyan-jet/10 dark:text-cyan-glow"
                                    : "border-white/10 bg-white/[0.04] text-text-secondary hover:text-text-primary"
                            )}
                        >
                            <span>{c.label}</span>
                            <span
                                className={cn(
                                    "inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums",
                                    active
                                        ? "bg-cyan-deep/20 text-cyan-deep dark:bg-cyan-jet/20 dark:text-cyan-glow"
                                        : "bg-white/[0.06] text-text-secondary"
                                )}
                            >
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={i18n.transactions.searchPlaceholder}
                    className="w-full rounded-full border border-white/10 bg-white/[0.04] pr-9 pl-4 py-2 text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-cyan-jet/60 focus:bg-white/[0.06] focus:shadow-[0_0_0_4px_rgba(14,165,233,0.12)]"
                />
            </div>

            {/* Ledger */}
            {items.length === 0 ? (
                <GlassCard padding="lg" className="text-center text-text-secondary">
                    <Receipt className="mx-auto h-6 w-6 text-text-secondary/60" />
                    <p className="mt-2 text-sm">{i18n.transactions.empty}</p>
                </GlassCard>
            ) : (
                <GlassCard padding="none" tone="elevated" className="overflow-hidden">
                    <ul className="divide-y divide-white/[0.05]">
                        {items.map((t, i) => (
                            <Row key={t.id} t={t} i={i} />
                        ))}
                    </ul>
                </GlassCard>
            )}

            <p className="text-center text-[10px] uppercase tracking-wider text-text-secondary">
                {i18n.transactions.immutableLedger}
            </p>
        </div>
    );
}

function Row({ t, i }: { t: Transaction; i: number }) {
    const sign = t.isReversal ? -TX_SIGN[t.type] : TX_SIGN[t.type];
    const amountStr =
        (sign > 0 ? "+" : "−") +
        formatCurrencyDetailed(t.amount, t.currency);
    return (
        <motion.li
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.02 }}
            className="flex items-center gap-3 px-3 sm:px-4 py-3 hover:bg-white/[0.02]"
        >
            <span
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${TONES[t.type]
                    }`}
            >
                {ICONS[t.type]}
            </span>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text-primary">
                    {t.description ?? t.type}
                </p>
                <p className="truncate text-[11px] text-text-secondary">
                    {fmtDate(t.createdAt)}
                    {t.transactionReference && (
                        <>
                            {" · "}
                            <span className="font-mono">{t.transactionReference}</span>
                        </>
                    )}
                    {" · "}#{t.id}
                </p>
            </div>
            <div className="shrink-0 text-left" dir="ltr">
                <p
                    className={`whitespace-nowrap font-mono text-sm font-semibold tabular-nums ${sign > 0 ? "text-success" : "text-warning"
                        }`}
                >
                    {amountStr}
                </p>
                <p className="whitespace-nowrap text-[10px] text-text-secondary tabular-nums">
                    יתרה {formatCurrencyDetailed(t.balanceAfter, t.currency)}
                </p>
            </div>
        </motion.li>
    );
}
