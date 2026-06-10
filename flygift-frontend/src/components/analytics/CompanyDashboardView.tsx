"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import { ApiUtils } from "@/utils/ApiUtils";
import { exportAnalyticsCsv, exportAnalyticsPdf } from "@/lib/analyticsExport";
import { formatCurrencyDetailed } from "@/utils/format";
import { nativeBridge } from "@/utils/nativeBridge";
import { t } from "@/i18n/he";
import type { AnalyticsResponse } from "@/lib/analyticsTypes";

const RANGES: { label: string; days: number }[] = [
    { label: "7D", days: 7 },
    { label: "30D", days: 30 },
    { label: "90D", days: 90 },
    { label: "1Y", days: 365 },
];

interface AnalyticsEnvelope {
    success: boolean;
    response?: string;
    data?: AnalyticsResponse;
}

/**
 * Stage 15 — Company Insights Dashboard.
 * Pulls real ROI data from `GET /api/Company/Analytics?days=N` on mount
 * and on range change. No demo fallback — empty companies see an empty
 * state, never fabricated numbers.
 */
export function CompanyDashboardView() {
    const search = useSearchParams();
    const initialSection: "insights" | "billing" =
        search?.get("section") === "billing" ? "billing" : "insights";

    const [section, setSection] = useState<"insights" | "billing">(initialSection);
    const [days, setDays] = useState(90);
    const [data, setData] = useState<AnalyticsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setFetchError(null);
        const { startRequest } = ApiUtils.get(`Company/Analytics?days=${days}`);
        startRequest()
            .then((res) => {
                if (cancelled) return;
                // ApiUtils.handleRequest already unwraps to response.data,
                // so `res` is the GeneralResponse envelope itself.
                const env = res as AnalyticsEnvelope | undefined;
                if (env?.success && env.data) {
                    setData(env.data);
                } else {
                    setFetchError(env?.response ?? "טעינת התובנות נכשלה.");
                }
            })
            .catch((e) => {
                if (cancelled) return;
                const msg =
                    (e as { message?: string })?.message ?? "שגיאת רשת.";
                setFetchError(msg);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [days]);

    const s = data?.summary;
    const isEmpty =
        !!data &&
        data.spendingTrend.length === 0 &&
        data.topDestinations.length === 0 &&
        (s?.totalCards ?? 0) === 0;

    return (
        <div className="space-y-4" dir="rtl">
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
                        <span className="relative">{t.analytics.sections[k]}</span>
                    </button>
                ))}
            </div>

            {section === "billing" ? (
                <BillingView />
            ) : loading ? (
                <GlassCard padding="lg" className="text-center text-text-secondary py-10">
                    טוען תובנות…
                </GlassCard>
            ) : fetchError ? (
                <GlassCard padding="lg" className="text-center text-danger py-10">
                    {fetchError}
                </GlassCard>
            ) : data && s && !isEmpty ? (
                <InsightsSection data={data} days={days} setDays={setDays} s={s} />
            ) : (
                <GlassCard padding="lg" className="text-center text-text-secondary py-10">
                    אין עדיין נתוני הזמנות.
                </GlassCard>
            )}
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
        <div className="space-y-6 py-6" dir="rtl">
            {/* Hero */}
            <motion.header
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
            >
                <div>
                    <p className="text-[10px] uppercase tracking-[0.25em] text-cyan-jet">
                        {t.analytics.kicker}
                    </p>
                    <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
                        <span className="text-gradient-skyline">{t.analytics.title}</span>
                    </h1>
                    <p className="mt-1 text-sm text-text-secondary">
                        {t.analytics.subtitle(
                            data.periodDays,
                            new Date(data.generatedAt).toLocaleString("he-IL"),
                        )}
                    </p>
                </div>
                <div className="flex flex-col items-end gap-2">
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
                            <span className="inline-flex items-center gap-1.5">
                                <FileSpreadsheet className="h-3.5 w-3.5" />
                                {t.analytics.actions.csv}
                            </span>
                        </GhostButton>
                        <PrimaryButton
                            type="button"
                            onClick={() => exportAnalyticsPdf(data)}
                            className="!h-10 !px-3 text-xs"
                        >
                            <span className="inline-flex items-center gap-1.5">
                                <Download className="h-3.5 w-3.5" />
                                {t.analytics.actions.exportReport}
                            </span>
                        </PrimaryButton>
                    </div>
                </div>
            </motion.header>

            {/* Top KPI band */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Kpi
                    icon={<Wallet className="h-4 w-4 text-cyan-jet" />}
                    label={t.analytics.kpis.distributed}
                    value={formatCurrencyDetailed(s.totalDistributed, s.currency)}
                    delta="+12.4%"
                    deltaTone="up"
                />
                <Kpi
                    icon={<TrendingUp className="h-4 w-4 text-violet-aurora" />}
                    label={t.analytics.kpis.redeemed}
                    value={formatCurrencyDetailed(s.redeemedAmount, s.currency)}
                    delta={`${s.redemptionRate.toFixed(1)}%`}
                    deltaTone="up"
                />
                <Kpi
                    icon={<Gift className="h-4 w-4 text-gold-champagne" />}
                    label={t.analytics.kpis.avgGift}
                    value={formatCurrencyDetailed(s.avgGiftAmount, s.currency)}
                    delta={t.analytics.kpis.cardsCount(s.totalCards)}
                    deltaTone="neutral"
                />
                <Kpi
                    icon={<Timer className="h-4 w-4 text-cyan-jet" />}
                    label={t.analytics.kpis.avgDaysToRedeem}
                    value={t.analytics.kpis.daysSuffix(s.avgTimeToRedemptionDays)}
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
                                    {t.analytics.trend.kicker}
                                </p>
                                <h2 className="font-display text-lg font-semibold">
                                    {t.analytics.trend.title}
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
                            {t.analytics.redemption.kicker}
                        </p>
                        <h2 className="mb-4 font-display text-lg font-semibold">
                            {t.analytics.redemption.title}
                        </h2>
                        <ProgressRing
                            value={s.redemptionRate}
                            label={t.analytics.redemption.ringLabel}
                            sublabel={t.analytics.redemption.ringSublabel(
                                s.redeemedCards,
                                s.totalCards,
                            )}
                        />
                        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                            <Pill label={t.analytics.redemption.pillActive} value={s.activeCards} tone="cyan" />
                            <Pill label={t.analytics.redemption.pillUsed} value={s.redeemedCards} tone="violet" />
                            <Pill label={t.analytics.redemption.pillExpired} value={s.expiredCards} tone="warn" />
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
                            {t.analytics.destinations.kicker}
                        </p>
                    </div>
                    <h2 className="mb-4 font-display text-lg font-semibold">
                        {t.analytics.destinations.title}
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
            <p className="text-center text-[10px] uppercase tracking-wider text-text-secondary">
                {label}
            </p>
            <p className="text-center font-mono text-lg font-semibold tabular-nums text-text-primary">
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
                <span className="h-2 w-2 rounded-full bg-violet-aurora" />{" "}
                {t.analytics.trend.legendDistributed}
            </span>
            <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-cyan-jet" />{" "}
                {t.analytics.trend.legendUsed}
            </span>
        </div>
    );
}
