"use client";

import Link from "next/link";
import { GhostButton } from "@/components/ui/Buttons";
import { GlassCard } from "@/components/ui/GlassCard";
import { PackageX, ArrowLeft } from "lucide-react";
import { t } from "@/i18n/he";

interface Props {
    /** Optional override — defaults to Hebrew "המתנה לא נמצאה". */
    title?: string;
    /** Optional override — defaults to Hebrew explanatory text. */
    description?: string;
}

/**
 * Premium empty/404 state — glass card with a soft sky-cyan halo
 * behind the icon to match the global aesthetic. All copy defaults
 * to Hebrew (Zero-English policy).
 */
export function GiftNotFound({ title, description }: Props) {
    return (
        <div
            dir="rtl"
            className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center py-10"
        >
            <GlassCard
                padding="lg"
                tone="elevated"
                glow="cyan"
                className="w-full text-center"
            >
                <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center">
                    {/* Soft cyan halo */}
                    <span
                        aria-hidden
                        className="absolute inset-0 rounded-full bg-cyan-deep/15 blur-xl dark:bg-cyan-jet/20"
                    />
                    <span className="relative flex h-16 w-16 items-center justify-center rounded-full border border-cyan-deep/30 bg-cyan-deep/10 text-cyan-deep dark:border-cyan-jet/40 dark:bg-cyan-jet/10 dark:text-cyan-glow">
                        <PackageX className="h-7 w-7" />
                    </span>
                </div>
                <h1 className="font-display text-xl font-semibold text-gradient-skyline">
                    {title ?? t.common.notFoundTitle}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                    {description ?? t.common.notFoundDescription}
                </p>
                <Link href="/dashboard" className="mt-6 inline-block">
                    <GhostButton type="button">
                        <ArrowLeft className="h-4 w-4" />
                        {t.common.backToDashboard}
                    </GhostButton>
                </Link>
            </GlassCard>
        </div>
    );
}
