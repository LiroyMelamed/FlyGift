"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
    Download,
    FileSpreadsheet,
    TrendingUp,
    Wallet,
    Gift,
    Timer,
    Globe2,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { PrimaryButton, GhostButton } from "@/components/ui/Buttons";
import { ProgressRing } from "./ProgressRing";
import { TrendChart } from "./TrendChart";
import { TopDestinationsChart } from "./TopDestinationsChart";
import { BillingView } from "./BillingView";
import { MOCK_ANALYTICS } from "@/lib/mockAnalytics";
import { exportAnalyticsCsv, exportAnalyticsPdf } from "@/lib/analyticsExport";
import { formatCurrencyDetailed } from "@/utils/format";
import { nativeBridge } from "@/utils/nativeBridge";
import type { AnalyticsResponse } from "@/lib/analyticsTypes";

const RANGES: { label: string; days: number }[] = [
    { label: "7D", days: 7 },
    { label: "30D", days: 30 },
    { label: "90D", days: 90 },
    { label: "1Y", days: 365 },
];

/**
 * Stage 15 — Company Insights Dashboard.
 * Replace MOCK_ANALYTICS with `ApiUtils.get('Company/Analytics?days=' + range)`.
 */
export function CompanyDashboardView() {
    const [section, setSection] = useState<"insights" | "billing">("insights");
    const [days, setDays] = useState(90);
    // In prod: fetch on `days` change. Here we reuse the same mock & pretend to slice.
    const data: AnalyticsResponse = useMemo(
        () => ({ ...MOCK_ANALYTICS, periodDays: days }),
        [days]
    );

    const s = data.summary;

    return (
        <div className="space-y-4">
            {/* Section tabs */}
            <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1">
                {(["insights", "billing"] as const).map((k) => (
                    <button
                        key={k}
                        type="button"
                        onClick={() => {
                            nativeBridge.haptic("light");
                            setSection(k);
                        }}
                        className={`relative px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors rounded-full ${section === k
                            ? "text-bg-base"
                            : "text-text-secondary hover:text-text-primary"
                            }`}
                    >
                        {section === k && (
                            <motion.span
                                layoutId="company-section-tab"
                                className="absolute inset-0 rounded-full bg-skyline-gradient"
                                transition={{ type: "spring", stiffness: 320, damping: 28 }}
                            />
                        )}
                        <span className="relative">{k === "insights" ? "תובנות" : "חיובים"}</span>
                    </button>
                ))}
            </div>

            {section === "billing" ? <BillingView /> : <InsightsSection data={data} days={days} setDays={setDays} s={s} />}
        </div>
    );
}

function InsightsSection({
    data,
    days,
    setDays,
    s,
}: {
    data: AnalyticsResponse;
    days: number;
    setDays: (n: number) => void;
    s: AnalyticsResponse["summary"];
}) {
    return (
        <div className="space-y-6 py-6">
            {/* Hero */}
            <motion.header
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
            >
                <div>
                    <p className="text-[10px] uppercase tracking-[0.25em] text-cyan-jet">
                        תובנות לחברה
                    </p>
                    <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
                        <span className="text-gradient-skyline">ROI Dashboard</span>
                    </h1>
                    <p className="mt-1 text-sm text-text-secondary">
                        Last {data.periodDays} days · Generated{" "}
                        {new Date(data.generatedAt).toLocaleString()}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1">
                        {RANGES.map((r) => (
                            <button
                                key={r.days}
                                type="button"
                                onClick={() => {
                                    nativeBridge.haptic("light");
                                    setDays(r.days);
                                }}
                                className={`relative rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors ${days === r.days
                                    ? "text-bg-base"
                                    : "text-text-secondary hover:text-text-primary"
                                    }`}
                            >
                                {days === r.days && (
                                    <motion.span
                                        layoutId="range-tab"
                                        className="absolute inset-0 rounded-full bg-skyline-gradient"
                                        transition={{ type: "spring", stiffness: 320, damping: 28 }}
                                    />
                                )}
                                <span className="relative">{r.label}</span>
                            </button>
                        ))}
                    </div>
                    <GhostButton
                        type="button"
                        onClick={() => exportAnalyticsCsv(data)}
                        className="!h-10 !px-3 text-xs"
                    >
                        <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
                    </GhostButton>
                    <PrimaryButton
                        type="button"
                        onClick={() => exportAnalyticsPdf(data)}
                        className="!h-10 !px-3 text-xs"
                    >
                        <Download className="h-3.5 w-3.5" /> Export Report
                    </PrimaryButton>
                </div>
            </motion.header>

            {/* Top KPI band */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Kpi
                    icon={<Wallet className="h-4 w-4 text-cyan-jet" />}
                    label="Distributed"
                    value={formatCurrencyDetailed(s.totalDistributed, s.currency)}
                    delta="+12.4%"
                    deltaTone="up"
                />
                <Kpi
                    icon={<TrendingUp className="h-4 w-4 text-violet-aurora" />}
                    label="Redeemed"
                    value={formatCurrencyDetailed(s.redeemedAmount, s.currency)}
                    delta={`${s.redemptionRate.toFixed(1)}%`}
                    deltaTone="up"
                />
                <Kpi
                    icon={<Gift className="h-4 w-4 text-gold-champagne" />}
                    label="Avg Gift"
                    value={formatCurrencyDetailed(s.avgGiftAmount, s.currency)}
                    delta={`${s.totalCards} cards`}
                    deltaTone="neutral"
                />
                <Kpi
                    icon={<Timer className="h-4 w-4 text-cyan-jet" />}
                    label="Avg Days to Redeem"
                    value={`${s.avgTimeToRedemptionDays.toFixed(1)}d`}
                    delta="−2.1d"
                    deltaTone="up"
                />
            </div>

            {/* Trend + Redemption */}
            <div className="grid gap-4 lg:grid-cols-3">
                <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="lg:col-span-2"
                >
                    <GlassCard padding="lg" tone="elevated" className="h-full">
                        <div className="mb-3 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] uppercase tracking-[0.2em] text-text-secondary">
                                    Spending Trend
                                </p>
                                <h2 className="font-display text-lg font-semibold">
                                    Distributed vs. Redeemed
                                </h2>
                            </div>
                            <Legend />
                        </div>
                        <TrendChart data={data.spendingTrend} />
                    </GlassCard>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                >
                    <GlassCard padding="lg" tone="elevated" glow="cyan" className="h-full">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-text-secondary">
                            Redemption Rate
                        </p>
                        <h2 className="mb-4 font-display text-lg font-semibold">
                            Engagement Health
                        </h2>
                        <ProgressRing
                            value={s.redemptionRate}
                            label="Redeemed"
                            sublabel={`${s.redeemedCards} of ${s.totalCards} cards used`}
                        />
                        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                            <Pill label="Active" value={s.activeCards} tone="cyan" />
                            <Pill label="Used" value={s.redeemedCards} tone="violet" />
                            <Pill label="Expired" value={s.expiredCards} tone="warn" />
                        </div>
                    </GlassCard>
                </motion.div>
            </div>

            {/* Top destinations */}
            <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <GlassCard padding="lg" tone="elevated">
                    <div className="mb-4 flex items-center gap-2">
                        <Globe2 className="h-4 w-4 text-cyan-jet" />
                        <p className="text-[10px] uppercase tracking-[0.2em] text-text-secondary">
                            Top Destinations
                        </p>
                    </div>
                    <h2 className="mb-4 font-display text-lg font-semibold">
                        Where your gifts are flying
                    </h2>
                    <TopDestinationsChart data={data.topDestinations} />
                </GlassCard>
            </motion.div>
        </div>
    );
}

function Kpi({
    icon,
    label,
    value,
    delta,
    deltaTone,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    delta?: string;
    deltaTone?: "up" | "down" | "neutral";
}) {
    const tone =
        deltaTone === "up"
            ? "text-success"
            : deltaTone === "down"
                ? "text-danger"
                : "text-text-secondary";
    return (
        <GlassCard padding="md" tone="elevated" className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="inline-flex items-center justify-center rounded-lg bg-white/[0.04] p-1.5">
                    {icon}
                </span>
                {delta && (
                    <span className={`font-mono text-[10px] font-semibold ${tone}`}>
                        {delta}
                    </span>
                )}
            </div>
            <p className="text-[10px] uppercase tracking-wider text-text-secondary">
                {label}
            </p>
            <p className="font-mono text-lg font-semibold tabular-nums text-text-primary">
                {value}
            </p>
        </GlassCard>
    );
}

function Pill({
    label,
    value,
    tone,
}: {
    label: string;
    value: number;
    tone: "cyan" | "violet" | "warn";
}) {
    const cls =
        tone === "cyan"
            ? "border-cyan-jet/30 text-cyan-jet"
            : tone === "violet"
                ? "border-violet-aurora/30 text-violet-aurora"
                : "border-warning/30 text-warning";
    return (
        <div className={`rounded-lg border ${cls} bg-white/[0.02] py-2`}>
            <p className="font-mono text-base font-semibold tabular-nums">{value}</p>
            <p className="text-[9px] uppercase tracking-wider text-text-secondary">
                {label}
            </p>
        </div>
    );
}

function Legend() {
    return (
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-text-secondary">
            <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-violet-aurora" /> Distributed
            </span>
            <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-cyan-jet" /> Used
            </span>
        </div>
    );
}
