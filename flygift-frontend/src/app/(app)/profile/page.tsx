"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { User2, Lock, Bell, Languages } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { PrimaryButton, GhostButton } from "@/components/ui/Buttons";
import { ApiUtils } from "@/utils/ApiUtils";
import { MOCK_USER } from "@/lib/mockData";
import { t } from "@/i18n/he";

export default function ProfilePage() {
    const router = useRouter();

    const signOut = () => {
        ApiUtils.removeAuthorizationHeader();
        document.cookie = "flygift_token=; Path=/; Max-Age=0; SameSite=Lax";
        router.replace("/login");
    };

    return (
        <div className="py-8" dir="rtl">
            <div className="mx-auto max-w-2xl space-y-6">
                <motion.header
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="space-y-1"
                >
                    <h1 className="font-display text-2xl font-semibold">
                        <span className="text-gradient-skyline">{t.profile.title}</span>
                    </h1>
                </motion.header>

                {/* Account */}
                <GlassCard tone="elevated" padding="lg">
                    <div className="mb-4 flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-jet/15">
                            <User2 className="h-5 w-5 text-cyan-jet" />
                        </span>
                        <h2 className="font-display text-base font-semibold">
                            {t.profile.section.account}
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field label={t.profile.fullName} defaultValue={MOCK_USER.firstName} />
                        <Field
                            label={t.profile.email}
                            defaultValue="user@flygift.com"
                            type="email"
                        />
                        <Field label={t.profile.phone} defaultValue="" type="tel" />
                    </div>
                    <div className="mt-4">
                        <PrimaryButton type="button">{t.profile.save}</PrimaryButton>
                    </div>
                </GlassCard>

                {/* Security */}
                <GlassCard tone="elevated" padding="lg">
                    <div className="mb-4 flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-aurora/15">
                            <Lock className="h-5 w-5 text-violet-aurora" />
                        </span>
                        <h2 className="font-display text-base font-semibold">
                            {t.profile.section.security}
                        </h2>
                    </div>
                    <div className="space-y-2">
                        <button
                            type="button"
                            className="ring-focus flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm hover:bg-white/[0.06]"
                        >
                            <span>{t.profile.changePassword}</span>
                            <span className="text-text-secondary">›</span>
                        </button>
                        <button
                            type="button"
                            className="ring-focus flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm hover:bg-white/[0.06]"
                        >
                            <span>{t.profile.twoFactor}</span>
                            <span className="text-text-secondary">›</span>
                        </button>
                    </div>
                </GlassCard>

                {/* Notifications + Language */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <GlassCard tone="elevated" padding="lg">
                        <div className="mb-3 flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-champagne/15">
                                <Bell className="h-5 w-5 text-gold-champagne" />
                            </span>
                            <h2 className="font-display text-sm font-semibold">
                                {t.profile.section.notifications}
                            </h2>
                        </div>
                        <p className="text-xs text-text-secondary">
                            {t.notifications.empty}
                        </p>
                    </GlassCard>
                    <GlassCard tone="elevated" padding="lg">
                        <div className="mb-3 flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-jet/15">
                                <Languages className="h-5 w-5 text-cyan-jet" />
                            </span>
                            <h2 className="font-display text-sm font-semibold">
                                {t.profile.section.language}
                            </h2>
                        </div>
                        <p className="text-xs text-text-secondary">עברית · ישראל</p>
                    </GlassCard>
                </div>

                {/* Sign out */}
                <GhostButton
                    type="button"
                    onClick={signOut}
                    className="w-full"
                >
                    {t.profile.signOut}
                </GhostButton>
            </div>
        </div>
    );
}

function Field({
    label,
    defaultValue,
    type = "text",
}: {
    label: string;
    defaultValue?: string;
    type?: string;
}) {
    return (
        <label className="block">
            <span className="mb-1 block text-xs text-text-secondary">{label}</span>
            <input
                type={type}
                defaultValue={defaultValue}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-cyan-jet/60 focus:bg-white/[0.06]"
            />
        </label>
    );
}
