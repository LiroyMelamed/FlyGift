"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck, UserPlus } from "lucide-react";
import { ApiUtils } from "@/utils/ApiUtils";
import { hydrateUserFromJwt } from "@/lib/appStore";
import { decodeJwt } from "@/utils/jwt";
import { t } from "@/i18n/he";

interface AuthEnvelope {
    success: boolean;
    response?: string;
    data?: string;  // JWT token, only set on Login
}

export default function RegisterPage() {
    const router = useRouter();
    const [fullName, setFullName] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);

        // Mirror the server-side validators on RegisterRequest so the user
        // gets fast feedback without a round-trip. Backend remains the
        // authority — these checks are UX, not security.
        const trimmedName = fullName.trim();
        if (trimmedName.length < 2) {
            setError("נא למלא שם מלא (לפחות 2 תווים)");
            return;
        }
        if (username.trim().length < 3) {
            setError("שם משתמש חייב להיות באורך של לפחות 3 תווים");
            return;
        }
        if (password.length < 6) {
            setError("סיסמה חייבת להיות באורך של לפחות 6 תווים");
            return;
        }
        if (password !== confirm) {
            setError("הסיסמאות לא תואמות");
            return;
        }

        setLoading(true);
        try {
            // 1. Create the account. Backend payload (matches RegisterRequest):
            //    { username, passwordHash, fullName, email?, role? }
            // FullName is required end-to-end; the User row stores
            // FirstName/LastName split server-side.
            const reg = (await ApiUtils.post("Auth/Register", {
                username: username.trim(),
                passwordHash: password,
                fullName: trimmedName,
            }).startRequest()) as AuthEnvelope;

            if (!reg?.success) {
                throw new Error(reg?.response || "ההרשמה נכשלה. נסו שוב.");
            }

            // 2. Auto-login so the HttpOnly auth cookie is set server-side.
            //    /Auth/Register doesn't set the cookie itself — only /Login
            //    does — so without this step the new account would be
            //    redirected to the dashboard with no session.
            const login = (await ApiUtils.post("Auth/Login", {
                username,
                passwordHash: password,
            }).startRequest()) as AuthEnvelope;

            if (!login?.success || !login.data) {
                // The account was created but auto-login failed; bounce them
                // to the login page so they can try manually.
                router.replace("/login?registered=1");
                return;
            }

            ApiUtils.setAuthorizationHeader(login.data); // for native clients
            const claims = decodeJwt(login.data);
            hydrateUserFromJwt();

            const dest = claims?.role === "Company" ? "/company/dashboard" : "/dashboard";
            router.replace(dest);
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
                            label={t.profile.fullName}
                            type="text"
                            value={fullName}
                            onChange={setFullName}
                            autoComplete="name"
                        />
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
