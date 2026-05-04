"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { UserCircle2, ArrowLeft, Search, Sun, Moon, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlobalSearch } from "@/components/shell/GlobalSearch";
import { NotificationsButton } from "@/components/shell/NotificationsButton";
import { nativeBridge } from "@/utils/nativeBridge";
import { cn } from "@/utils/cn";
import { t } from "@/i18n/he";
import { useTheme } from "@/theme/ThemeProvider";
import { useAppDerived } from "@/lib/appStore";
import { formatCurrencyDetailed } from "@/utils/format";

export interface TopBarProps {
    isWebView?: boolean;
    title?: string;
    showBack?: boolean;
    className?: string;
}

export function TopBar({
    isWebView = false,
    title,
    showBack = false,
    className,
}: TopBarProps) {
    const router = useRouter();
    const [searchOpen, setSearchOpen] = useState(false);
    const { isDark, toggleTheme } = useTheme();
    const { totalBalance, user } = useAppDerived();

    const handleBack = () => {
        nativeBridge.haptic("light");
        router.back();
    };

    // Cmd/Ctrl + K opens the global search palette
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setSearchOpen((v) => !v);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    return (
        <header
            className={cn(
                "sticky top-0 z-40 w-full",
                isWebView ? "pt-safe" : "pt-3",
                "px-4 pb-3",
                className
            )}
        >
            <GlassCard
                tone="elevated"
                padding="none"
                className="flex h-14 items-center justify-between rounded-2xl px-4"
            >
                <div className="flex items-center gap-3">
                    {showBack ? (
                        <button
                            type="button"
                            onClick={handleBack}
                            aria-label={t.nav.back}
                            className="ring-focus inline-flex h-9 w-9 items-center justify-center rounded-full text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                    ) : (
                        <Link
                            href="/dashboard"
                            className="ring-focus font-display text-lg font-semibold tracking-tight"
                            onClick={() => nativeBridge.haptic("light")}
                        >
                            <span className="text-gradient-skyline">{t.appName}</span>
                        </Link>
                    )}
                    {title && (
                        <span className="font-display text-base font-medium text-text-primary">
                            {title}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1.5">
                    {/* Live wallet badge — single source of truth from appStore */}
                    <button
                        type="button"
                        onClick={() => {
                            nativeBridge.haptic("light");
                            router.push("/transactions");
                        }}
                        aria-label={t.dashboard.totalBalance}
                        className="ring-focus hidden sm:inline-flex items-center gap-1.5 rounded-full border border-cyan-jet/30 bg-cyan-jet/10 px-3 h-9 text-xs font-mono tabular-nums text-cyan-glow hover:bg-cyan-jet/15 transition-colors"
                    >
                        <Wallet className="h-3.5 w-3.5" />
                        <span dir="ltr">{formatCurrencyDetailed(totalBalance, user.currency)}</span>
                    </button>
                    {/* Desktop: search trigger with ⌘K hint */}
                    <button
                        type="button"
                        aria-label={t.nav.search}
                        onClick={() => {
                            nativeBridge.haptic("light");
                            setSearchOpen(true);
                        }}
                        className="ring-focus hidden md:inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 h-9 text-xs text-text-secondary hover:text-text-primary hover:bg-white/[0.06] transition-colors"
                    >
                        <Search className="h-3.5 w-3.5" />
                        <span>{t.nav.search}</span>
                        <kbd className="ml-1 rounded border border-white/15 bg-white/5 px-1 py-0.5 text-[9px] font-mono">
                            ⌘K
                        </kbd>
                    </button>
                    {/* Mobile: icon-only */}
                    <button
                        type="button"
                        aria-label={t.nav.search}
                        onClick={() => {
                            nativeBridge.haptic("light");
                            setSearchOpen(true);
                        }}
                        className="ring-focus md:hidden inline-flex h-9 w-9 items-center justify-center rounded-full text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
                    >
                        <Search className="h-5 w-5" />
                    </button>
                    <NotificationsButton />
                    <button
                        type="button"
                        onClick={() => {
                            nativeBridge.haptic("light");
                            toggleTheme();
                        }}
                        aria-label={isDark ? "מצב יום" : "מצב לילה"}
                        className="ring-focus inline-flex h-9 w-9 items-center justify-center rounded-full text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
                    >
                        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    </button>
                    <Link
                        href="/profile"
                        aria-label={t.nav.account}
                        onClick={() => nativeBridge.haptic("light")}
                        className="ring-focus inline-flex h-9 w-9 items-center justify-center rounded-full text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
                    >
                        <UserCircle2 className="h-6 w-6" />
                    </Link>
                </div>
            </GlassCard>
            <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
        </header>
    );
}
