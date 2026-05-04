"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck, UserPlus } from "lucide-react";
import { ApiUtils } from "@/utils/ApiUtils";
import { t } from "@/i18n/he";

function setAuthCookie(token: string) {
    document.cookie =
        `flygift_token=${encodeURIComponent(token)}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

export default function RegisterPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        if (password !== confirm) {
            setError("הסיסמאות לא תואמות");
            return;
        }
        setLoading(true);
        try {
            const res = await ApiUtils.post("Auth/Register", {
                Username: username,
                PasswordHash: password,
            }).startRequest();

            const token =
                (res?.data as string | undefined) ??
                (res?.Data as string | undefined);
            const ok = res?.success ?? res?.Success;

            if (ok && token) {
                ApiUtils.setAuthorizationHeader(token);
                setAuthCookie(token);
                router.replace("/dashboard");
                return;
            }
            // Backend may not auto-login: try login, otherwise redirect to /
            router.replace("/?registered=1");
        } catch (err) {
            const msg =
                err instanceof Error && err.message
                    ? err.message
                    : "ההרשמה נכשלה. נסו שוב.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main
            dir="rtl"
            className="relative min-h-dvh w-full overflow-hidden"
        >
            <div className="mx-auto flex min-h-dvh w-full max-w-screen-xl items-center justify-center px-4">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45 }}
                    className="w-full max-w-md rounded-3xl border border-border-glass bg-bg-glass p-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.5)] backdrop-blur-xl"
                >
                    <div className="mb-6 flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-jet/15 text-cyan-glow">
                            <UserPlus className="h-5 w-5" />
                        </span>
                        <div>
                            <h1 className="font-display text-xl font-semibold text-text-primary">
                                פתיחת חשבון FlyGift
                            </h1>
                            <p className="text-xs text-text-secondary">
                                שניות ספורות ואתם בפנים — בלי תשלום, בלי התחייבות.
                            </p>
                        </div>
                    </div>

                    <form onSubmit={onSubmit} className="space-y-3">
                        <FieldText
                            label={t.auth.username}
                            type="text"
                            value={username}
                            onChange={setUsername}
                            autoComplete="username"
                        />
                        <FieldText
                            label={t.auth.password}
                            type="password"
                            value={password}
                            onChange={setPassword}
                            autoComplete="new-password"
                        />
                        <FieldText
                            label="אימות סיסמה"
                            type="password"
                            value={confirm}
                            onChange={setConfirm}
                            autoComplete="new-password"
                        />

                        {error && (
                            <p
                                role="alert"
                                className="rounded-xl border border-error/40 bg-error/10 px-3 py-2 text-xs text-error"
                            >
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-gold inline-flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            <ShieldCheck className="h-4 w-4" />
                            {loading ? "יוצר חשבון…" : "צרו חשבון"}
                        </button>
                    </form>

                    <p className="mt-5 text-center text-xs text-text-secondary">
                        כבר רשומים?{" "}
                        <Link
                            href="/login"
                            className="font-semibold text-cyan-glow hover:underline"
                        >
                            התחברות
                        </Link>
                    </p>

                    <Link
                        href="/"
                        className="mt-6 inline-flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary"
                    >
                        <ArrowLeft className="h-3 w-3" />
                        חזרה לעמוד הבית
                    </Link>
                </motion.div>
            </div>
        </main>
    );
}

function FieldText({
    label,
    type,
    value,
    onChange,
    autoComplete,
}: {
    label: string;
    type: string;
    value: string;
    onChange: (v: string) => void;
    autoComplete?: string;
}) {
    return (
        <label className="block">
            <span className="mb-1 block text-xs text-text-secondary">{label}</span>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                autoComplete={autoComplete}
                required
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-cyan-jet/60 focus:bg-white/[0.06] focus:shadow-[0_0_0_4px_rgba(14,165,233,0.12)]"
            />
        </label>
    );
}
