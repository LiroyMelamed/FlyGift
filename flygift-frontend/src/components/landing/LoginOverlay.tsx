"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, X } from "lucide-react";
import axios from "axios";
import { ApiUtils } from "@/utils/ApiUtils";
import { t } from "@/i18n/he";
import { useLoginOverlay } from "./LoginOverlayContext";

function setAuthCookie(token: string) {
    document.cookie =
        `flygift_token=${encodeURIComponent(token)}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

export function LoginOverlay() {
    const { isOpen, close } = useLoginOverlay();
    const router = useRouter();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Lock body scroll while open + ESC to close
    useEffect(() => {
        if (!isOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") close();
        };
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener("keydown", onKey);
        };
    }, [isOpen, close]);

    const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const res = await ApiUtils.post("Auth/Login", {
                Username: username,
                PasswordHash: password,
            }, { timeout: 45_000 }).startRequest();

            const token =
                (res?.data as string | undefined) ??
                (res?.Data as string | undefined);
            const ok = res?.success ?? res?.Success;

            if (!ok || !token) {
                throw new Error(res?.response || res?.Response || "Login failed");
            }
            ApiUtils.setAuthorizationHeader(token);
            setAuthCookie(token);
            close();
            router.replace("/dashboard");
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
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="login-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    className="fixed inset-0 z-[100] flex items-center justify-center px-4"
                    role="dialog"
                    aria-modal="true"
                    aria-label={t.auth.welcome}
                    dir="rtl"
                >
                    {/* Translucent backdrop — clouds/stars remain visible behind */}
                    <button
                        type="button"
                        aria-label="Close"
                        onClick={close}
                        className="absolute inset-0 cursor-default bg-[#0F172A]/30 backdrop-blur-md"
                    />

                    {/* Frosted-glass card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.97 }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        className="relative w-full max-w-md rounded-3xl border border-white/60 bg-white/80 p-7 text-[#0F172A] shadow-[0_30px_80px_-20px_rgba(15,23,42,0.45)] backdrop-blur-xl"
                    >
                        <button
                            type="button"
                            onClick={close}
                            aria-label="Close"
                            className="absolute left-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#0F172A]/10 bg-white/70 text-[#0F172A] backdrop-blur transition-colors hover:bg-white"
                        >
                            <X className="h-4 w-4" />
                        </button>

                        <div className="mb-6 flex items-center gap-3">
                            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0F172A]/10 text-[#0F172A]">
                                <ShieldCheck className="h-5 w-5" />
                            </span>
                            <div>
                                <h2 className="font-display text-xl font-semibold text-[#0F172A]">
                                    {t.auth.welcome}
                                </h2>
                                <p className="text-xs text-[#0F172A]/70">
                                    {t.auth.welcomeSub}
                                </p>
                            </div>
                        </div>

                        <form onSubmit={onSubmit} className="space-y-3">
                            <label className="block">
                                <span className="mb-1 block text-xs text-[#0F172A]/70">
                                    {t.auth.username}
                                </span>
                                <input
                                    type="text"
                                    autoComplete="username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    className="w-full rounded-xl border border-[#0F172A]/15 bg-white px-3 py-2.5 text-sm text-[#0F172A] outline-none transition-colors placeholder:text-[#0F172A]/40 focus:border-[#1E3A8A] focus:bg-white focus:shadow-[0_0_0_4px_rgba(14,165,233,0.12)]"
                                />
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-xs text-[#0F172A]/70">
                                    {t.auth.password}
                                </span>
                                <input
                                    type="password"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full rounded-xl border border-[#0F172A]/15 bg-white px-3 py-2.5 text-sm text-[#0F172A] outline-none transition-colors placeholder:text-[#0F172A]/40 focus:border-[#1E3A8A] focus:bg-white focus:shadow-[0_0_0_4px_rgba(14,165,233,0.12)]"
                                />
                            </label>

                            {error && (
                                <p
                                    role="alert"
                                    className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700"
                                >
                                    {error}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#0F172A] text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(15,23,42,0.5)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {loading ? t.auth.signingIn : t.auth.signInCta}
                            </button>
                        </form>

                        <p className="mt-5 text-center text-xs text-[#0F172A]/70">
                            {t.auth.noAccount}{" "}
                            <a
                                href="/register"
                                className="font-semibold text-[#1E3A8A] hover:underline"
                            >
                                {t.auth.createAccount}
                            </a>
                        </p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
