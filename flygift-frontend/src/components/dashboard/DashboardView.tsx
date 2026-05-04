"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Send, Gift, Plane, Hotel, ArrowUpRight } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GiftCardCarousel } from "@/components/giftcard/GiftCardCarousel";
import { QuickAction } from "@/components/dashboard/QuickAction";
import { TransactionList } from "@/components/dashboard/TransactionList";
import { formatCurrencyDetailed } from "@/utils/format";
import { t } from "@/i18n/he";
import { useAppDerived } from "@/lib/appStore";

const fadeUp = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
};

export function DashboardView() {
    const router = useRouter();
    const { user, activeCards, transactions, totalBalance, activeGiftCount } =
        useAppDerived();
    return (
        <div className="space-y-8 py-6" dir="rtl">
            {/* ========== Hero ========== */}
            <motion.header
                {...fadeUp}
                transition={{ duration: 0.4 }}
                className="space-y-1"
            >
                <p className="text-sm text-text-secondary">{t.dashboard.welcomeBack}</p>
                <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
                    <span className="text-gradient-skyline">{user.firstName}</span>
                </h1>
            </motion.header>

            {/* ========== Balance Card (clickable → ledger) ========== */}
            <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.05 }}>
                <button
                    type="button"
                    onClick={() => router.push("/transactions")}
                    aria-label={t.dashboard.viewLedger}
                    className="ring-focus block w-full text-right"
                >
                    <GlassCard padding="lg" glow="cyan" className="relative overflow-hidden cursor-pointer transition-transform hover:-translate-y-0.5">
                        {/* Ripple emitter — anchors at the trailing edge in RTL */}
                        <span
                            aria-hidden
                            className="pointer-events-none absolute -left-6 top-1/2 -translate-y-1/2 h-24 w-24"
                        >
                            <span className="balance-ripple-ring absolute inset-0 rounded-full border border-cyan-jet/40" />
                            <span className="balance-ripple-ring delay-1 absolute inset-0 rounded-full border border-gold-champagne/30" />
                            <span className="balance-ripple-ring delay-2 absolute inset-0 rounded-full border border-violet-aurora/30" />
                        </span>
                        <div className="flex items-start justify-between gap-3 relative z-[1]">
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] sm:text-xs uppercase tracking-[0.2em] text-[#475569] dark:text-text-secondary">
                                    {t.dashboard.totalBalance}
                                </p>
                                <p className="mt-3 font-mono text-[clamp(1.75rem,8vw,3rem)] sm:text-5xl font-semibold tabular-nums text-[#0F172A] dark:text-text-primary break-all leading-tight">
                                    {formatCurrencyDetailed(
                                        totalBalance,
                                        user.currency
                                    )}
                                </p>
                                <p className="mt-2 text-sm text-[#475569] dark:text-text-secondary">
                                    {t.dashboard.across(activeGiftCount)}
                                </p>
                            </div>
                            <span
                                aria-hidden
                                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-text-secondary"
                            >
                                <ArrowUpRight className="h-5 w-5 -scale-x-100" />
                            </span>
                        </div>

                        {/* Decorative accent */}
                        <div
                            aria-hidden
                            className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-cyan-jet/10 blur-3xl"
                        />
                    </GlassCard>
                </button>
            </motion.div>

            {/* ========== Quick Actions ========== */}
            <motion.section
                {...fadeUp}
                transition={{ duration: 0.4, delay: 0.1 }}
                aria-labelledby="quick-actions-heading"
            >
                <h2 id="quick-actions-heading" className="sr-only">
                    {t.dashboard.quickActions}
                </h2>
                <div className="flex items-center justify-around gap-2">
                    <QuickAction
                        href="/gifts/send"
                        label={t.dashboard.sendGift}
                        icon={Send}
                        tone="cyan"
                    />
                    <QuickAction
                        href="/redeem"
                        label={t.dashboard.redeem}
                        icon={Gift}
                        tone="violet"
                    />
                    <QuickAction
                        href="/bookings/flights"
                        label={t.dashboard.flights}
                        icon={Plane}
                        tone="cyan"
                    />
                    <QuickAction
                        href="/hotels"
                        label={t.dashboard.hotels}
                        icon={Hotel}
                        tone="gold"
                    />
                </div>
            </motion.section>

            {/* ========== Active Gifts Carousel ========== */}
            <motion.section
                {...fadeUp}
                transition={{ duration: 0.4, delay: 0.15 }}
                aria-labelledby="active-gifts-heading"
                className="space-y-4"
            >
                <div className="flex items-baseline justify-between">
                    <h2
                        id="active-gifts-heading"
                        className="font-display text-lg font-semibold"
                    >
                        {t.dashboard.activeGifts}
                    </h2>
                    <button className="text-xs text-text-secondary hover:text-text-primary transition-colors" type="button" onClick={() => router.push("/transactions")}>
                        {t.dashboard.viewAll}
                    </button>
                </div>
                <GiftCardCarousel
                    cards={activeCards}
                    onSelect={(c) => router.push(`/gifts/${c.id}`)}
                />
            </motion.section>

            {/* ========== Recent Transactions ========== */}
            <motion.section
                {...fadeUp}
                transition={{ duration: 0.4, delay: 0.2 }}
                aria-labelledby="recent-tx-heading"
            >
                <h2 id="recent-tx-heading" className="sr-only">
                    {t.dashboard.recentActivity}
                </h2>
                <TransactionList items={transactions} />
            </motion.section>
        </div>
    );
}
