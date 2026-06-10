"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Home,
    Gift,
    Send,
    History,
    Plane,
    Hotel,
    User2,
    Ticket,
    BarChart3,
    Upload,
    Receipt,
    type LucideIcon,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { useAppDerived } from "@/lib/appStore";
import { cn } from "@/utils/cn";
import { t } from "@/i18n/he";

type NavItem = { href: string; label: string; icon: LucideIcon };

const PRIMARY: NavItem[] = [
    { href: "/dashboard", label: t.nav.dashboard, icon: Home },
    { href: "/gifts", label: t.nav.myGifts, icon: Gift },
    { href: "/gifts/send", label: t.nav.sendGift, icon: Send },
    { href: "/redeem", label: t.nav.redeem, icon: Ticket },
    { href: "/transactions", label: t.nav.history, icon: History },
];

const TRAVEL: NavItem[] = [
    { href: "/bookings/mine", label: t.nav.myTrips, icon: Plane },
    { href: "/bookings/flights", label: t.nav.flights, icon: Plane },
    { href: "/hotels", label: t.nav.hotels, icon: Hotel },
];

const SECONDARY: NavItem[] = [
    { href: "/profile", label: t.nav.profile, icon: User2 },
];

// Visible only when `user.role === "Company"`. The Insights link points
// at the analytics dashboard's "insights" tab; Billing points at the
// same component but in its "billing" section.
const COMPANY: NavItem[] = [
    { href: "/company/dashboard", label: t.nav.insights, icon: BarChart3 },
    { href: "/company/bulk-upload", label: t.nav.bulkUpload, icon: Upload },
    { href: "/company/dashboard?tab=billing", label: t.nav.billing, icon: Receipt },
];

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
    const Icon = item.icon;
    return (
        <Link
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
                "ring-focus group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                    ? "bg-white/[0.06] text-text-primary"
                    : "text-text-secondary hover:text-text-primary hover:bg-white/[0.03]"
            )}
        >
            <span
                className={cn(
                    "absolute right-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-l-full bg-cyan-jet shadow-glow-cyan transition-opacity",
                    active ? "opacity-100" : "opacity-0"
                )}
            />
            <Icon
                className={cn(
                    "h-4.5 w-4.5 transition-colors",
                    active ? "text-cyan-jet" : "text-text-secondary group-hover:text-text-primary"
                )}
            />
            <span>{item.label}</span>
        </Link>
    );
}

export function Sidebar({ className }: { className?: string }) {
    const pathname = usePathname() || "/";
    const { user } = useAppDerived();
    const isCompany = user.role === "Company" || user.role === "Admin";
    const isActive = (href: string) => {
        // Strip query string when matching so /company/dashboard?tab=…
        // still highlights when the user is on /company/dashboard.
        const path = href.split("?")[0];
        return path === "/dashboard" ? pathname === path : pathname.startsWith(path);
    };

    return (
        <aside
            className={cn("hidden lg:block w-64 shrink-0 px-4 py-4", className)}
        >
            <GlassCard tone="elevated" padding="md" className="sticky top-4">
                <div className="mb-4 px-1">
                    <Link
                        href="/dashboard"
                        className="ring-focus inline-flex items-center gap-2"
                    >
                        <span className="font-display text-xl font-semibold tracking-tight text-gradient-skyline">
                            {t.appName}
                        </span>
                    </Link>
                    <p className="mt-1 text-xs text-text-secondary">{t.tagline}</p>
                </div>

                <nav className="space-y-1">
                    {PRIMARY.map((item) => (
                        <NavLink key={item.href} item={item} active={isActive(item.href)} />
                    ))}
                </nav>

                <div className="my-4 border-t border-white/5" />
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-secondary/70">
                    {t.nav.travel}
                </p>
                <nav className="space-y-1">
                    {TRAVEL.map((item) => (
                        <NavLink key={item.href} item={item} active={isActive(item.href)} />
                    ))}
                </nav>

                {isCompany && (
                    <>
                        <div className="my-4 border-t border-white/5" />
                        <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gold-champagne/80">
                            {t.nav.companySection}
                        </p>
                        <nav className="space-y-1">
                            {COMPANY.map((item) => (
                                <NavLink
                                    key={item.href}
                                    item={item}
                                    active={isActive(item.href)}
                                />
                            ))}
                        </nav>
                    </>
                )}

                <div className="my-4 border-t border-white/5" />
                <nav className="space-y-1">
                    {SECONDARY.map((item) => (
                        <NavLink key={item.href} item={item} active={isActive(item.href)} />
                    ))}
                </nav>
            </GlassCard>
        </aside>
    );
}
