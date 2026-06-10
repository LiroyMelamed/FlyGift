"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { PrimaryButton } from "@/components/ui/Buttons";
import axios from "axios";
import { ApiUtils } from "@/utils/ApiUtils";
import { hydrateUserFromJwt } from "@/lib/appStore";
import { decodeJwt } from "@/utils/jwt";
import { t } from "@/i18n/he";

function LoginInner() {
    const router = useRouter();
    const params = useSearchParams();
    const next = params?.get("next") || "/dashboard";

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const res = await ApiUtils.post("Auth/Login", {
                Username: username,
                PasswordHash: password,
            }, { timeout: 45_000 }).startRequest();

            // Backend returns GeneralResponse { Success, Response, Data: <jwt> }
            const token =
                (res?.data as string | undefined) ??
                (res?.Data as string | undefined);
            const ok = res?.success ?? res?.Success;

            if (!ok || !token) {
                throw new Error(res?.response || res?.Response || "Login failed");
            }
            // The auth cookie is set by the backend (HttpOnly, Secure,
            // SameSite from config) on this same response. We can't read
            // it from JS — that's the point. We DO get the token in the
            // body though, which lets us decode role for routing without
            // an extra API roundtrip. The token itself is not stored.
            ApiUtils.setAuthorizationHeader(token); // for any in-flight calls in this tab
            const claims = decodeJwt(token);
            // Persist role/displayName into the appStore from the JWT we
            // just received — avoids needing a /Me endpoint.
            hydrateUserFromJwt();

            const dest =
                next !== "/dashboard"
                    ? next
                    : claims?.role === "Company"
                        ? "/company/dashboard"
                        : "/dashboard";
            router.replace(dest);
        } catch (err) {
            const isTimeout =
                axios.isAxiosError(err)
                && (err.code === "ECONNABORTED" || err.message.includes("timeout"));
            const msg = isTimeout
                ? t.auth.loginSlow
                : err instanceof Error && err.message
                    ? err.message
                    : t.auth.invalidCredentials;
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-dvh overflow-hidden" dir="rtl">
            <AuroraBackground intensity={0.85} />
            <div className="relative z-10 mx-auto flex min-h-dvh max-w-md items-center px-4">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45 }}
                    className="w-full"
                >
                    <GlassCard tone="elevated" padding="lg" glow="cyan">
                        <div className="mb-6 flex items-center gap-3">
                            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-jet/15">
                                <ShieldCheck className="h-5 w-5 text-cyan-jet" />
                            </span>
                            <div>
                                <h1 className="font-display text-xl font-semibold">
                                    <span className="text-gradient-skyline">{t.auth.welcome}</span>
                                </h1>
                                <p className="text-xs text-text-secondary">
                                    {t.auth.welcomeSub}
                                </p>
                            </div>
                        </div>

                        <form onSubmit={onSubmit} className="space-y-3">
                            <label className="block">
                                <span className="mb-1 block text-xs text-text-secondary">
                                    {t.auth.username}
                                </span>
                                <input
                                    type="text"
                                    autoComplete="username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-cyan-jet/60 focus:bg-white/[0.06]"
                                />
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-xs text-text-secondary">
                                    {t.auth.password}
                                </span>
                                <input
                                    type="password"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-cyan-jet/60 focus:bg-white/[0.06]"
                                />
                            </label>

                            {error && (
                                <p
                                    role="alert"
                                    className="rounded-xl border border-error/30 bg-error/10 px-3 py-2 text-xs text-error"
                                >
                                    {error}
                                </p>
                            )}

                            <PrimaryButton
                                type="submit"
                                loading={loading}
                                loadingText={t.auth.signingIn}
                            >
                                {t.auth.signInCta}
                            </PrimaryButton>
                        </form>

                        <p className="mt-5 text-center text-xs text-text-secondary">
                            {t.auth.noAccount}{" "}
                            <Link
                                href="/register"
                                className="text-cyan-jet hover:text-cyan-glow"
                            >
                                {t.auth.createAccount}
                            </Link>
                        </p>
                    </GlassCard>
                </motion.div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={null}>
            <LoginInner />
        </Suspense>
    );
}
