"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
    Home,
    Gift,
    Send,
    History,
    Plane,
    BarChart3,
    UploadCloud,
    Receipt,
    type LucideIcon,
} from "lucide-react";
import { nativeBridge } from "@/utils/nativeBridge";
import { cn } from "@/utils/cn";
import { t } from "@/i18n/he";
import { useAppDerived } from "@/lib/appStore";

type NavItem = {
    href: string;
    label: string;
    icon: LucideIcon;
    highlight?: boolean;
};

const CLIENT_ITEMS: NavItem[] = [
    { href: "/dashboard", label: t.nav.dashboard, icon: Home },
    { href: "/gifts", label: t.nav.myGifts, icon: Gift },
    { href: "/gifts/send", label: t.nav.sendGift, icon: Send, highlight: true },
    { href: "/bookings/mine", label: t.nav.myTrips, icon: Plane },
];

const COMPANY_ITEMS: NavItem[] = [
    { href: "/company/dashboard", label: t.nav.insights, icon: BarChart3 },
    { href: "/company/bulk-upload", label: t.nav.bulkUpload, icon: UploadCloud, highlight: true },
    { href: "/company/dashboard?tab=billing", label: t.nav.billing, icon: Receipt },
    { href: "/profile", label: t.nav.profile, icon: History },
];

export interface BottomNavProps {
    className?: string;
}

export function BottomNav({ className }: BottomNavProps) {
    const pathname = usePathname() || "/";
    const { user } = useAppDerived();
    const items =
        user.role === "Company" || user.role === "Admin"
            ? COMPANY_ITEMS
            : CLIENT_ITEMS;

    return (
        <nav
            aria-label="Primary navigation"
            className={cn(
                // Sidebar takes over at `lg+`; hide the bottom bar there
                // so we don't render two parallel nav surfaces.
                "fixed inset-x-0 bottom-0 z-40 px-3 pb-safe lg:hidden",
                className
            )}
        >
            <div className="mx-auto max-w-md">
                <div className="glass-strong shadow-glass relative mb-2 flex items-center justify-between rounded-2xl px-2 py-1.5">
                    {items.map((item) => {
                        const path = item.href.split("?")[0];
                        const active =
                            path === "/dashboard" || path === "/company/dashboard"
                                ? pathname === path
                                : pathname.startsWith(path);

                        const Icon = item.icon;

                        if (item.highlight) {
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    aria-label={item.label}
                                    onClick={() => nativeBridge.haptic("medium")}
                                    className="ring-focus relative -mt-7 inline-flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-skyline-gradient shadow-glow-cyan"
                                >
                                    <Icon className="h-6 w-6 text-white" strokeWidth={2.4} />
                                </Link>
                            );
                        }

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                aria-label={item.label}
                                aria-current={active ? "page" : undefined}
                                onClick={() => nativeBridge.haptic("light")}
                                className="ring-focus relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-2 text-text-secondary transition-colors hover:text-text-primary"
                            >
                                {active && (
                                    <motion.span
                                        layoutId="bottomnav-active"
                                        className="absolute inset-1 rounded-xl bg-white/[0.06]"
                                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                                    />
                                )}
                                <Icon
                                    className={cn(
                                        "relative h-5 w-5 transition-colors",
                                        active && "text-cyan-jet"
                                    )}
                                />
                                <span
                                    className={cn(
                                        "relative text-[10px] font-medium leading-none transition-colors",
                                        active && "text-text-primary"
                                    )}
                                >
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
}
