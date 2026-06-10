"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { User2, Lock, Bell, Languages } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { PrimaryButton, GhostButton } from "@/components/ui/Buttons";
import { ApiUtils } from "@/utils/ApiUtils";
import { t } from "@/i18n/he";
import { resetAppStore, setUserDisplayName } from "@/lib/appStore";

interface UserProfile {
    id: number;
    userName: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phoneNumber?: string | null;
    fullName?: string;
}

interface ApiEnvelope<T> {
    success?: boolean;
    Success?: boolean;
    response?: string;
    Response?: string;
    data?: T;
    Data?: T;
}

function readProfile(payload: ApiEnvelope<UserProfile> | UserProfile | null | undefined): UserProfile | null {
    if (!payload || typeof payload !== "object") return null;
    if ("id" in payload && typeof payload.id === "number") return payload;
    const env = payload as ApiEnvelope<UserProfile>;
    return env.data ?? env.Data ?? null;
}

export default function ProfilePage() {
    const router = useRouter();
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const loadProfile = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = (await ApiUtils.get("Auth/Me").startRequest()) as ApiEnvelope<UserProfile>;
            const profile = readProfile(res);
            if (!profile) throw new Error(t.common.dbError);
            setFullName(
                profile.fullName?.trim() ||
                    [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim()
            );
            setEmail(profile.email ?? "");
            setPhone(profile.phoneNumber ?? "");
        } catch (e: unknown) {
            const err = e as { response?: { data?: { response?: string } }; message?: string };
            setError(err?.response?.data?.response || err?.message || t.common.dbError);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadProfile();
    }, [loadProfile]);

    const onSave = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            const res = (await ApiUtils.put("Auth/Profile", {
                fullName: fullName.trim(),
                email: email.trim(),
                phoneNumber: phone.trim() || null,
            }).startRequest()) as ApiEnvelope<UserProfile>;

            const ok = res?.success ?? res?.Success;
            if (ok === false) {
                throw new Error(res?.response || res?.Response || t.profile.saveFailed);
            }

            const profile = readProfile(res);
            const savedName =
                profile?.fullName?.trim() ||
                [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim() ||
                fullName.trim();
            setUserDisplayName(savedName);
            if (profile?.email) setEmail(profile.email);
            if (profile?.phoneNumber) setPhone(profile.phoneNumber);
            setSuccess(t.profile.saveSuccess);
        } catch (e: unknown) {
            const err = e as { response?: { data?: { response?: string } }; message?: string };
            setError(err?.response?.data?.response || err?.message || t.profile.saveFailed);
        } finally {
            setSaving(false);
        }
    };

    const signOut = async () => {
        try {
            await ApiUtils.post("Auth/Logout", {}).startRequest();
        } catch {
            // ignore — logout best-effort
        }
        ApiUtils.removeAuthorizationHeader();
        resetAppStore();
        router.replace("/");
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

                <GlassCard tone="elevated" padding="lg">
                    <div className="mb-4 flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-jet/15">
                            <User2 className="h-5 w-5 text-cyan-jet" />
                        </span>
                        <h2 className="font-display text-base font-semibold">
                            {t.profile.section.account}
                        </h2>
                    </div>

                    {loading ? (
                        <p className="text-sm text-text-secondary">{t.common.loading}</p>
                    ) : (
                        <form onSubmit={onSave} className="space-y-4">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <Field
                                    label={t.profile.fullName}
                                    value={fullName}
                                    onChange={setFullName}
                                    required
                                />
                                <Field
                                    label={t.profile.email}
                                    value={email}
                                    onChange={setEmail}
                                    type="email"
                                    required
                                    hint={t.profile.emailHint}
                                />
                                <Field
                                    label={t.profile.phone}
                                    value={phone}
                                    onChange={setPhone}
                                    type="tel"
                                    placeholder="+972501234567"
                                />
                            </div>

                            {error && (
                                <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                                    {error}
                                </p>
                            )}
                            {success && (
                                <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                                    {success}
                                </p>
                            )}

                            <PrimaryButton type="submit" disabled={saving}>
                                {saving ? t.common.loading : t.profile.save}
                            </PrimaryButton>
                        </form>
                    )}
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
                        <p className="text-xs text-text-secondary">{t.notifications.empty}</p>
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

                <GhostButton type="button" onClick={signOut} className="w-full">
                    {t.profile.signOut}
                </GhostButton>
            </div>
        </div>
    );
}

function Field({
    label,
    value,
    onChange,
    type = "text",
    required,
    placeholder,
    hint,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: string;
    required?: boolean;
    placeholder?: string;
    hint?: string;
}) {
    return (
        <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs text-text-secondary">{label}</span>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                required={required}
                placeholder={placeholder}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-cyan-jet/60 focus:bg-white/[0.06]"
            />
            {hint ? <span className="mt-1 block text-[11px] text-text-secondary">{hint}</span> : null}
        </label>
    );
}
