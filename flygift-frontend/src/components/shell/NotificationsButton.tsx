"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, BellOff } from "lucide-react";
import { nativeBridge } from "@/utils/nativeBridge";
import { t } from "@/i18n/he";
import { cn } from "@/utils/cn";

/**
 * Bell icon + lightweight dropdown anchored beneath the topbar button.
 * Uses light/glass styling so it visually matches the landing aesthetic.
 */
export function NotificationsButton({ className }: { className?: string }) {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);
    const notifications: { id: string; title: string; body: string; at: string }[] = [];
    const hasUnread = notifications.length > 0;

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
                    className
                )}
            >
                <Bell className="h-5 w-5" />
                {hasUnread && (
                    <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[#0EA5E9] shadow-[0_0_8px_rgba(14,165,233,0.7)]" />
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
                        className="absolute right-0 top-[calc(100%+8px)] z-50 w-80 origin-top-right rounded-2xl border border-white/60 bg-white/90 p-4 text-[#0F172A] shadow-[0_20px_60px_-15px_rgba(15,23,42,0.35)] backdrop-blur-xl"
                    >
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="font-display text-sm font-semibold text-[#0F172A]">
                                {t.notifications.title}
                            </h2>
                        </div>

                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
                                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0F172A]/5">
                                    <BellOff className="h-5 w-5 text-[#0F172A]/60" />
                                </span>
                                <p className="font-display text-sm font-medium text-[#0F172A]">
                                    {t.notifications.empty}
                                </p>
                                <p className="max-w-xs text-xs text-[#0F172A]/60">
                                    {t.notifications.emptyHint}
                                </p>
                            </div>
                        ) : (
                            <ul className="max-h-80 space-y-2 overflow-y-auto">
                                {notifications.map((n) => (
                                    <li
                                        key={n.id}
                                        className="rounded-xl border border-[#0F172A]/10 bg-white p-3"
                                    >
                                        <p className="text-sm font-medium text-[#0F172A]">{n.title}</p>
                                        <p className="text-xs text-[#0F172A]/70">{n.body}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
