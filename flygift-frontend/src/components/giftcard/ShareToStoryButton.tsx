"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Share2, Check, X, Download, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { PrimaryButton, GhostButton } from "@/components/ui/Buttons";
import { nativeBridge } from "@/utils/nativeBridge";
import {
    downloadStoryPoster,
    type StoryPosterResult,
} from "@/lib/storyPoster";
import { t } from "@/i18n/he";
import type { MockGiftCard } from "@/lib/mockData";

interface Props {
    card: MockGiftCard;
    /** Override "A Gift from {company}" headline. */
    companyName?: string;
}

type Phase = "idle" | "rendering" | "ready" | "shared" | "error";

/**
 * Stage 18 — "Share the Joy" CTA. Generates a 9:16 Instagram Story
 * poster client-side (Canvas 2D, zero deps), previews it, and ships
 * the base64 across the native bridge to open the IG Story composer.
 */
export function ShareToStoryButton({ card, companyName }: Props) {
    const [phase, setPhase] = useState<Phase>("idle");
    const [progress, setProgress] = useState(0);
    const [poster, setPoster] = useState<StoryPosterResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const cancelled = useRef(false);

    useEffect(() => {
        cancelled.current = false;
        return () => {
            cancelled.current = true;
        };
    }, []);

    const startRender = async () => {
        cancelled.current = false;
        setError(null);
        setProgress(0);
        setPoster(null);
        setPhase("rendering");
        nativeBridge.haptic("light");

        try {
            if (typeof document === "undefined") {
                throw new Error("שיתוף זמין רק בצד הלקוח");
            }
            // Lazy-load canvas-heavy module so any sync error inside is caught here.
            const { generateStoryPoster: gen } = await import("@/lib/storyPoster");
            const result = await gen({
                card,
                companyName,
                onProgress: (p) => {
                    if (!cancelled.current) setProgress(p);
                },
            });
            if (cancelled.current) return;
            setPoster(result);
            setPhase("ready");
            // Subtle "ding" — the asset is ready to share.
            nativeBridge.haptic("light");
        } catch (e) {
            // Defensive: never let this crash the host app.
            console.error("[ShareToStory] generation failed", e);
            setError(
                e instanceof Error && e.message
                    ? e.message
                    : "יצירת הסטורי נכשלה. נסו שוב."
            );
            setPhase("error");
            nativeBridge.haptic("error");
        }
    };

    const share = () => {
        if (!poster) return;
        nativeBridge.haptic("medium");
        const ok = nativeBridge.shareToStory({
            imageBase64: poster.base64,
            platform: "instagram",
            attributionUrl: "https://flygift.com",
            backgroundTopColor: "#02061A",
            backgroundBottomColor: "#000208",
        });
        if (ok) {
            setPhase("shared");
            setTimeout(() => setPhase("ready"), 1800);
        }
    };

    const closePreview = () => {
        setPhase("idle");
        setPoster(null);
        setProgress(0);
    };

    return (
        <>
            <PrimaryButton
                type="button"
                onClick={startRender}
                disabled={phase === "rendering"}
                className="w-full"
            >
                <Sparkles className="h-4 w-4" />
                {t.share.cta}
            </PrimaryButton>

            <AnimatePresence>
                {phase === "rendering" && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/80 backdrop-blur-sm px-6"
                    >
                        <motion.div
                            initial={{ y: 16, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 8, opacity: 0 }}
                            className="w-full max-w-sm"
                        >
                            <GlassCard padding="lg" tone="elevated" glow="cyan" className="text-center">
                                <Loader2 className="mx-auto h-7 w-7 animate-spin text-cyan-jet" />
                                <p className="mt-4 font-display text-lg font-semibold">
                                    {t.share.generatingTitle}
                                </p>
                                <p className="mt-1 text-xs text-text-secondary">
                                    {t.share.generatingHint}
                                </p>

                                {/* Progress bar */}
                                <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-white/10">
                                    <motion.div
                                        className="h-full rounded-full bg-skyline-gradient"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.round(progress * 100)}%` }}
                                        transition={{ ease: "easeOut", duration: 0.25 }}
                                    />
                                </div>
                                <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-text-secondary">
                                    {Math.round(progress * 100)}%
                                </p>
                            </GlassCard>
                        </motion.div>
                    </motion.div>
                )}

                {(phase === "ready" || phase === "shared") && poster && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/85 backdrop-blur-md px-4 py-8"
                        onClick={closePreview}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 12 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 220, damping: 22 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative w-full max-w-xs"
                        >
                            <button
                                type="button"
                                onClick={closePreview}
                                aria-label={t.share.closePreview}
                                className="absolute -top-3 -right-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-bg-base/90 text-text-secondary hover:text-text-primary"
                            >
                                <X className="h-4 w-4" />
                            </button>

                            {/* Phone-like 9:16 frame */}
                            <div className="overflow-hidden rounded-3xl border border-white/15 shadow-[0_30px_80px_-20px_rgba(0,229,255,0.45)]">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={poster.dataUrl}
                                    alt={t.share.altPoster}
                                    width={poster.width}
                                    height={poster.height}
                                    className="block h-auto w-full"
                                />
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-2">
                                <GhostButton
                                    type="button"
                                    onClick={() => downloadStoryPoster(poster.dataUrl)}
                                >
                                    <Download className="h-4 w-4" /> {t.share.save}
                                </GhostButton>
                                <PrimaryButton type="button" onClick={share}>
                                    {phase === "shared" ? (
                                        <>
                                            <Check className="h-4 w-4" /> {t.share.sent}
                                        </>
                                    ) : (
                                        <>
                                            <Share2 className="h-4 w-4" /> {t.share.postToStory}
                                        </>
                                    )}
                                </PrimaryButton>
                            </div>

                            <p className="mt-3 text-center text-[10px] uppercase tracking-wider text-text-secondary">
                                {t.share.platforms}
                            </p>
                        </motion.div>
                    </motion.div>
                )}

                {phase === "error" && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="fixed left-1/2 top-6 z-50 -translate-x-1/2"
                    >
                        <GlassCard padding="md" className="border border-danger/40">
                            <p className="text-sm text-danger">{error}</p>
                            <button
                                type="button"
                                onClick={() => setPhase("idle")}
                                className="mt-1 text-[10px] uppercase tracking-wider text-text-secondary hover:text-text-primary"
                            >
                                {t.common.dismiss}
                            </button>
                        </GlassCard>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
