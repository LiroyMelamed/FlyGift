"use client";

import { motion } from "framer-motion";
import {
    Download,
    FileText,
    CheckCircle2,
    Clock,
    AlertTriangle,
    ExternalLink,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GhostButton } from "@/components/ui/Buttons";
import { formatCurrencyDetailed } from "@/utils/format";
import { MOCK_INVOICES } from "@/lib/mockInvoices";
import { t } from "@/i18n/he";
import type { BulkOrderStatus, InvoiceDto } from "@/lib/billingTypes";

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("he-IL", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });

const STATUS: Record<
    BulkOrderStatus,
    { label: string; icon: React.ReactNode; cls: string }
> = {
    0: {
        label: t.billing.statuses.Pending,
        icon: <Clock className="h-3 w-3" />,
        cls: "border-warning/30 text-warning bg-warning/10",
    },
    1: {
        label: t.billing.statuses.Invoiced,
        icon: <CheckCircle2 className="h-3 w-3" />,
        cls: "border-success/30 text-success bg-success/10",
    },
    2: {
        label: t.billing.statuses.Failed,
        icon: <AlertTriangle className="h-3 w-3" />,
        cls: "border-danger/30 text-danger bg-danger/10",
    },
};

/**
 * Stage 17 — Billing tab. Replace MOCK_INVOICES with
 * `ApiUtils.get('Company/Billing/Invoices').startRequest()` once reachable.
 */
export function BillingView() {
    const data = MOCK_INVOICES;
    const currency = data.invoices[0]?.currency ?? "USD";

    return (
        <div className="space-y-6 py-6" dir="rtl">
            <motion.header
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-1"
            >
                <p className="text-[10px] uppercase tracking-[0.25em] text-cyan-jet">
                    {t.billing.kicker}
                </p>
                <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
                    <span className="text-gradient-skyline">{t.billing.title}</span>
                </h1>
                <p className="text-sm text-text-secondary">
                    {t.billing.subtitle}
                </p>
            </motion.header>

            <div className="grid gap-3 sm:grid-cols-3">
                <GlassCard padding="md" tone="elevated">
                    <p className="text-[10px] uppercase tracking-wider text-text-secondary">
                        {t.billing.totalInvoiced}
                    </p>
                    <p className="mt-1 font-mono text-xl font-semibold tabular-nums">
                        {formatCurrencyDetailed(data.summary.totalInvoiced, currency)}
                    </p>
                </GlassCard>
                <GlassCard padding="md" tone="elevated">
                    <p className="text-[10px] uppercase tracking-wider text-text-secondary">
                        {t.billing.pending}
                    </p>
                    <p className="mt-1 font-mono text-xl font-semibold text-warning tabular-nums">
                        {data.summary.pending}
                    </p>
                </GlassCard>
                <GlassCard padding="md" tone="elevated">
                    <p className="text-[10px] uppercase tracking-wider text-text-secondary">
                        {t.billing.failed}
                    </p>
                    <p className="mt-1 font-mono text-xl font-semibold text-danger tabular-nums">
                        {data.summary.failed}
                    </p>
                </GlassCard>
            </div>

            <GlassCard padding="none" tone="elevated" className="overflow-hidden">
                {/* Header (md+) */}
                <div className="hidden grid-cols-[1.4fr_1fr_0.7fr_0.9fr_0.9fr_120px] gap-3 border-b border-white/[0.05] px-5 py-3 text-[10px] uppercase tracking-wider text-text-secondary md:grid">
                    <span>{t.billing.columns.invoice}</span>
                    <span>{t.billing.columns.batch}</span>
                    <span className="text-right">{t.billing.columns.recipients}</span>
                    <span className="text-right">{t.billing.columns.amount}</span>
                    <span>{t.billing.columns.status}</span>
                    <span className="text-right">{t.billing.columns.action}</span>
                </div>

                <ul className="divide-y divide-white/[0.05]">
                    {data.invoices.map((inv, i) => (
                        <InvoiceRow key={inv.id} inv={inv} index={i} />
                    ))}
                </ul>
            </GlassCard>
        </div>
    );
}

function InvoiceRow({ inv, index }: { inv: InvoiceDto; index: number }) {
    const status = STATUS[inv.status];
    const downloadable = !!inv.invoiceUrl;
    return (
        <motion.li
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            className="grid grid-cols-1 gap-3 px-5 py-4 hover:bg-white/[0.02] md:grid-cols-[1.4fr_1fr_0.7fr_0.9fr_0.9fr_120px] md:items-center"
        >
            <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
                    <FileText className="h-4 w-4 text-cyan-jet" />
                </span>
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text-primary">
                        {inv.invoiceNumber ?? t.billing.awaitingIssuance}
                    </p>
                    <p className="text-[11px] text-text-secondary">
                        {fmtDate(inv.createdAt)}
                        {inv.invoicedAt && ` ${t.billing.issuedOn(fmtDate(inv.invoicedAt))}`}
                    </p>
                </div>
            </div>

            <p className="truncate font-mono text-[11px] text-text-secondary md:text-xs">
                {inv.batchId}
            </p>

            <p className="text-right font-mono text-sm tabular-nums">
                {inv.recipientCount}
            </p>

            <p className="text-right font-mono text-sm font-semibold tabular-nums">
                {formatCurrencyDetailed(inv.totalCharged, inv.currency)}
            </p>

            <span
                className={`inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${status.cls}`}
            >
                {status.icon}
                {status.label}
            </span>

            <div className="flex justify-start md:justify-end">
                {downloadable ? (
                    <a
                        href={inv.invoiceUrl!}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1.5 rounded-full border border-cyan-jet/40 bg-cyan-jet/10 px-3 py-1.5 text-[11px] font-semibold text-cyan-jet transition-colors hover:bg-cyan-jet/20"
                    >
                        <Download className="h-3.5 w-3.5" /> PDF
                        <ExternalLink className="h-3 w-3 opacity-60" />
                    </a>
                ) : (
                    <GhostButton
                        type="button"
                        disabled
                        className="!h-8 !px-3 text-[11px] opacity-50"
                    >
                        <Clock className="h-3 w-3" /> {t.billing.queued}
                    </GhostButton>
                )}
            </div>
        </motion.li>
    );
}
