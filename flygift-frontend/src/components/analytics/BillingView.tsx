"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
    Download,
    FileText,
    CheckCircle2,
    Clock,
    AlertTriangle,
    ExternalLink,
    Plus,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GhostButton, PrimaryButton } from "@/components/ui/Buttons";
import { formatCurrencyDetailed } from "@/utils/format";
import { ApiUtils } from "@/utils/ApiUtils";
import { t } from "@/i18n/he";
import { DepositModal } from "./DepositModal";
import type { BulkOrderStatus, InvoiceDto } from "@/lib/billingTypes";

/**
 * Build the API download URL for an invoice. Replaces the legacy
 * `https://invoices.flygift.app/...` mock URL that doesn't resolve on
 * localhost. Backend route: `/api/Company/Billing/Invoices/{id}/Download`.
 */
function invoiceDownloadHref(id: number): string {
    return `${ApiUtils.getBaseUrl()}/Company/Billing/Invoices/${id}/Download`;
}

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

interface InvoicesPayload {
    invoices: InvoiceDto[];
    summary: { count: number; totalInvoiced: number; pending: number; failed: number };
}

interface InvoicesEnvelope {
    success: boolean;
    response?: string;
    data?: InvoicesPayload;
}

/**
 * Stage 17 — Billing tab. נטען נתונים מה-API בלבד.
 */
export function BillingView() {
    const [data, setData] = useState<InvoicesPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [depositOpen, setDepositOpen] = useState(false);

    useEffect(() => {
        setLoading(true);
        ApiUtils.get('Company/Billing/Invoices').startRequest()
            .then((res) => {
                const env = res as InvoicesEnvelope | undefined;
                if (env?.success && env.data) {
                    setData(env.data);
                } else {
                    setError(env?.response ?? 'שגיאה בטעינת חשבוניות');
                }
                setLoading(false);
            })
            .catch(() => {
                setError('שגיאה בטעינת חשבוניות');
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="py-10 text-center">טוען חשבוניות…</div>;
    if (error) return <div className="py-10 text-center text-danger">{error}</div>;
    if (!data || !data.invoices?.length) return <div className="py-10 text-center">אין חשבוניות להצגה.</div>;

    const currency = data.invoices[0]?.currency ?? "USD";

    return (
        <div className="space-y-6 py-6" dir="rtl">
            <motion.header
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
            >
                <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-cyan-jet">
                        {t.billing.kicker}
                    </p>
                    <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
                        <span className="text-gradient-skyline">{t.billing.title}</span>
                    </h1>
                    <p className="text-sm text-text-secondary">{t.billing.subtitle}</p>
                </div>
                <PrimaryButton
                    type="button"
                    onClick={() => setDepositOpen(true)}
                    className="!h-10 !w-auto !px-4 text-sm"
                >
                    <span className="inline-flex items-center gap-1.5">
                        <Plus className="h-4 w-4" />
                        טעינת יתרה
                    </span>
                </PrimaryButton>
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
                {/* Header — horizontal at sm+ (no batchId), full 6-col at md+. */}
                <div className="hidden gap-3 border-b border-white/[0.05] px-5 py-3 text-[10px] uppercase tracking-wider text-text-secondary sm:grid sm:grid-cols-[1.6fr_0.7fr_0.9fr_0.9fr_120px] md:grid-cols-[1.4fr_1fr_0.7fr_0.9fr_0.9fr_120px]">
                    <span>{t.billing.columns.invoice}</span>
                    <span className="hidden md:inline">{t.billing.columns.batch}</span>
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

            <DepositModal
                open={depositOpen}
                onClose={() => setDepositOpen(false)}
            />
        </div>
    );
}

function InvoiceRow({ inv, index }: { inv: InvoiceDto; index: number }) {
    const status = STATUS[inv.status];
    // The "downloadable" gate is the issued invoice number, not the URL —
    // the URL is now synthesized from the row id (invoiceDownloadHref) so
    // localhost works regardless of what the legacy mock data carried.
    const downloadable = !!inv.invoiceNumber;
    return (
        <motion.li
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            className="grid grid-cols-1 gap-3 px-5 py-4 hover:bg-white/[0.02] sm:grid-cols-[1.6fr_0.7fr_0.9fr_0.9fr_120px] sm:items-center md:grid-cols-[1.4fr_1fr_0.7fr_0.9fr_0.9fr_120px]"
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

            {/* The full UUID is information-dense and useless on phones —
                hide until md+ where the column reappears in the grid. */}
            <p className="hidden truncate font-mono text-[11px] text-text-secondary md:block md:text-xs">
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

            <div className="flex justify-start sm:justify-end">
                {downloadable ? (
                    <a
                        href={invoiceDownloadHref(inv.id)}
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
