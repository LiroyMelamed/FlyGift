"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Copy, Check } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { nativeBridge } from "@/utils/nativeBridge";
import { cn } from "@/utils/cn";

interface Props {
    code: string;
    /** Pre-revealed (e.g., for sender-side view). */
    initiallyRevealed?: boolean;
    className?: string;
}

/**
 * Reveal-the-code interaction. Tap to peel away the cover and
 * unveil the secret code, then copy with one click.
 */
export function RevealCode({
    code,
    initiallyRevealed = false,
    className,
}: Props) {
    const [revealed, setRevealed] = useState(initiallyRevealed);
    const [copied, setCopied] = useState(false);

    const reveal = () => {
        if (revealed) return;
        nativeBridge.haptic("medium");
        setRevealed(true);
    };

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            nativeBridge.haptic("light");
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
        } catch {
            /* ignore */
        }
    };

    return (
        <GlassCard padding="md" className={cn("relative overflow-hidden", className)}>
            <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-text-secondary">
                קוד המתנה
            </p>

            <div className="relative">
                <p className="font-mono text-2xl font-semibold tracking-[0.2em] text-text-primary">
                    {code}
                </p>

                <AnimatePresence>
                    {!revealed && (
                        <motion.button
                            type="button"
                            onClick={reveal}
                            initial={{ opacity: 1 }}
                            exit={{ opacity: 0, scale: 1.04 }}
                            transition={{ duration: 0.45, ease: "easeOut" }}
                            aria-label="הצג קוד מתנה"
                            className="ring-focus absolute inset-0 -m-1 flex items-center justify-center gap-2 rounded-xl border border-[#0F172A]/10"
                            style={{
                                background:
                                    "linear-gradient(110deg, rgba(241,245,249,0.95) 0%, rgba(226,232,240,0.95) 50%, rgba(241,245,249,0.95) 100%)",
                                backdropFilter: "blur(8px)",
                            }}
                        >
                            <span
                                aria-hidden
                                className="shimmer-overlay absolute inset-0 mix-blend-overlay opacity-40"
                            />
                            <Eye className="h-4 w-4 text-[#0F172A]" />
                            <span className="text-sm font-semibold text-[#0F172A]">
                                לחצו לחשיפת הקוד
                            </span>
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>

            {revealed && (
                <motion.button
                    type="button"
                    onClick={copy}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="ring-focus mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#0F172A]/5 px-3 py-1.5 text-xs font-medium text-[#0F172A] hover:bg-[#0F172A]/10 transition-colors"
                >
                    {copied ? (
                        <>
                            <Check className="h-3.5 w-3.5 text-success" />
                            הועתק
                        </>
                    ) : (
                        <>
                            <Copy className="h-3.5 w-3.5" />
                            העתקת קוד
                        </>
                    )}
                </motion.button>
            )}
        </GlassCard>
    );
}
