"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, BellOff, Check } from "lucide-react";
import { ApiUtils } from "@/utils/ApiUtils";
import { nativeBridge } from "@/utils/nativeBridge";
import { t } from "@/i18n/he";
import { cn } from "@/utils/cn";

interface NotificationDto {
    id: number;
    type: string;
    title: string;
    body: string | null;
    href: string | null;
    createdAt: string;
    readAt: string | null;
}

interface MineEnvelope {
    success: boolean;
    response?: string;
    data?: {
        items: NotificationDto[];
        unreadCount: number;
    };
}

const POLL_MS = 60_000;

function relativeHe(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 60_000) return "לפני רגע";
    const m = Math.floor(ms / 60_000);
    if (m < 60) return `לפני ${m} דק׳`;
    const h = Math.floor(m / 60);
    if (h < 24) return `לפני ${h} שע׳`;
    const d = Math.floor(h / 24);
    if (d < 7) return `לפני ${d} ימים`;
    return new Date(iso).toLocaleDateString("he-IL", { day: "numeric", month: "short" });
}

/**
 * Bell icon + dropdown that fetches /api/Notifications/Mine on mount and
 * polls every 60s. Clicking a row marks it read and (if `href` is set)
 * navigates to the deep link. The bell badge counts unread items.
 */
export function NotificationsButton({ className }: { className?: string }) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);
    const [items, setItems] = useState<NotificationDto[]>([]);
    const [unread, setUnread] = useState(0);

    const fetchMine = useCallback(async () => {
        try {
            const env = (await ApiUtils.get("Notifications/Mine").startRequest()) as MineEnvelope;
            if (env?.success && env.data) {
                setItems(env.data.items);
                setUnread(env.data.unreadCount);
            }
        } catch {
            // Silent: notifications are auxiliary; never break the navbar.
        }
    }, []);

    // Initial fetch + 60s polling. Skipped while the dropdown is open so
    // a click doesn't race with a refresh.
    useEffect(() => {
        let cancelled = false;
        const tick = async () => {
            if (cancelled || open) return;
            await fetchMine();
        };
        tick();
        const id = window.setInterval(tick, POLL_MS);
        return () => {
            cancelled = true;
            window.clearInterval(id);
        };
    }, [fetchMine, open]);

    // Refresh when dropdown opens so the badge reflects reality.
    useEffect(() => {
        if (open) fetchMine();
    }, [open, fetchMine]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
        const onClick = (e: MouseEvent) => {
            if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
        };
        window.addEventListener("keydown", onKey);
        window.addEventListener("mousedown", onClick);
        return () => {
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("mousedown", onClick);
        };
    }, [open]);

    const onRowClick = async (n: NotificationDto) => {
        nativeBridge.haptic("light");
        // Optimistic: mark read locally, then call the API.
        if (!n.readAt) {
            setItems((prev) =>
                prev.map((it) =>
                    it.id === n.id ? { ...it, readAt: new Date().toISOString() } : it,
                ),
            );
            setUnread((u) => Math.max(0, u - 1));
            try {
                await ApiUtils.post(`Notifications/${n.id}/Read`, {}).startRequest();
            } catch {
                // Silent — we'll re-sync on the next poll.
            }
        }
        if (n.href) {
            setOpen(false);
            router.push(n.href);
        }
    };

    const onMarkAll = async () => {
        nativeBridge.haptic("light");
        const now = new Date().toISOString();
        setItems((prev) => prev.map((it) => (it.readAt ? it : { ...it, readAt: now })));
        setUnread(0);
        try {
            await ApiUtils.post("Notifications/ReadAll", {}).startRequest();
        } catch {
            // Silent — we'll re-sync on the next poll.
        }
    };

    return (
        <div ref={wrapRef} className="relative">
            <button
                type="button"
                aria-label={t.nav.notifications}
                onClick={() => {
                    nativeBridge.haptic("light");
                    setOpen((v) => !v);
                }}
                className={cn(
                    "ring-focus relative inline-flex h-9 w-9 items-center justify-center rounded-full text-text-secondary hover:text-text-primary hover:bg-white/40 transition-colors",
                    className,
                )}
            >
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                    <span
                        className="absolute -top-0.5 -right-0.5 inline-flex min-w-[16px] h-4 items-center justify-center rounded-full bg-[#00C2CB] px-1 text-[10px] font-semibold text-white shadow-[0_0_8px_rgba(0,194,203,0.7)]"
                        aria-label={`${unread} התראות חדשות`}
                    >
                        {unread > 9 ? "9+" : unread}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        role="dialog"
                        aria-modal="false"
                        aria-label={t.notifications.title}
                        dir="rtl"
                        initial={{ opacity: 0, y: -6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute left-0 top-[calc(100%+8px)] z-50 w-[min(20rem,calc(100vw-2rem))] origin-top-left rounded-2xl border border-white/60 bg-white/95 p-4 text-[#0D1B2A] shadow-[0_20px_60px_-15px_rgba(15,23,42,0.35)] backdrop-blur-xl"
                    >
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="font-display text-sm font-semibold text-[#0D1B2A]">
                                {t.notifications.title}
                            </h2>
                            {unread > 0 && (
                                <button
                                    type="button"
                                    onClick={onMarkAll}
                                    className="inline-flex items-center gap-1 rounded-full border border-[#0D1B2A]/15 bg-[#0D1B2A]/5 px-2 py-0.5 text-[10px] font-semibold text-[#0D1B2A] hover:bg-[#0D1B2A]/10"
                                >
                                    <Check className="h-3 w-3" />
                                    סמן הכל כנקרא
                                </button>
                            )}
                        </div>

                        {items.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
                                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0D1B2A]/5">
                                    <BellOff className="h-5 w-5 text-[#0D1B2A]/60" />
                                </span>
                                <p className="font-display text-sm font-medium text-[#0D1B2A]">
                                    {t.notifications.empty}
                                </p>
                                <p className="max-w-xs text-xs text-[#0D1B2A]/60">
                                    {t.notifications.emptyHint}
                                </p>
                            </div>
                        ) : (
                            <ul className="max-h-96 space-y-2 overflow-y-auto">
                                {items.map((n) => {
                                    const isUnread = n.readAt == null;
                                    return (
                                        <li key={n.id}>
                                            <button
                                                type="button"
                                                onClick={() => onRowClick(n)}
                                                className={cn(
                                                    "ring-focus block w-full rounded-xl border bg-white p-3 text-right transition-colors",
                                                    isUnread
                                                        ? "border-[#00C2CB]/30 hover:bg-[#00C2CB]/5"
                                                        : "border-[#0D1B2A]/10 hover:bg-[#0D1B2A]/5",
                                                )}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className={cn(
                                                        "text-sm",
                                                        isUnread ? "font-semibold text-[#0D1B2A]" : "text-[#0D1B2A]/80",
                                                    )}>
                                                        {n.title}
                                                    </p>
                                                    {isUnread && (
                                                        <span
                                                            className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-[#00C2CB]"
                                                            aria-hidden
                                                        />
                                                    )}
                                                </div>
                                                {n.body && (
                                                    <p className="mt-0.5 text-xs text-[#0D1B2A]/70">{n.body}</p>
                                                )}
                                                <p className="mt-1 text-[10px] text-[#0D1B2A]/50">
                                                    {relativeHe(n.createdAt)}
                                                </p>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
