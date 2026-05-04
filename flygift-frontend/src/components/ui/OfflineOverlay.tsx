"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { WifiOff } from "lucide-react";

/**
 * Listens for browser online/offline events and, while offline,
 * shows a non-blocking banner at the top of the screen.
 */
export function OfflineOverlay() {
    const [online, setOnline] = useState(true);

    useEffect(() => {
        if (typeof navigator === "undefined") return;
        setOnline(navigator.onLine);

        const onOnline = () => setOnline(true);
        const onOffline = () => setOnline(false);
        window.addEventListener("online", onOnline);
        window.addEventListener("offline", onOffline);
        return () => {
            window.removeEventListener("online", onOnline);
            window.removeEventListener("offline", onOffline);
        };
    }, []);

    return (
        <AnimatePresence>
            {!online && (
                <motion.div
                    initial={{ y: -60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -60, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 320, damping: 28 }}
                    role="status"
                    aria-live="polite"
                    className="fixed inset-x-0 top-0 z-[100] mx-auto flex max-w-md items-center justify-center gap-2 rounded-b-2xl border border-white/10 bg-midnight-900/80 px-4 py-2 text-sm text-text-primary shadow-glass backdrop-blur-xl"
                    style={{ marginTop: "env(safe-area-inset-top, 0px)" }}
                >
                    <WifiOff className="h-4 w-4 text-danger" />
                    <span>You&apos;re offline. Some features may be unavailable.</span>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
