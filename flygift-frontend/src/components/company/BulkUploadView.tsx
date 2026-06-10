"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Send, Download } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { PrimaryButton, GhostButton } from "@/components/ui/Buttons";
import { TextField } from "@/components/ui/FormFields";
import { formatCurrencyDetailed } from "@/utils/format";
import { readAuthCookie } from "@/utils/jwt";

interface BulkRow {
    rowNumber: number;
    name: string;
    email: string;
    phone?: string | null;
    amount: number;
    currency: string;
    errors: string[];
    isValid: boolean;
}

interface BulkPreview {
    rows: BulkRow[];
    validCount: number;
    invalidCount: number;
    totalAmount: number;
}

interface ApiEnvelope<T> {
    success: boolean;
    response?: string;
    data?: T;
}

interface BulkConfirmRow {
    rowNumber: number;
    email: string;
    success: boolean;
    giftCardId?: number;
    error?: string;
}

interface BulkConfirmResult {
    batchId: string;
    totalRows: number;
    succeededRows: number;
    failedRows: number;
    totalCharged: number;
    rows: BulkConfirmRow[];
}

const apiBase =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE_URL) || "";

async function postFile<T>(
    path: string,
    file: File,
    extraFields?: Record<string, string>,
): Promise<ApiEnvelope<T>> {
    const fd = new FormData();
    fd.append("file", file);
    if (extraFields) {
        for (const [k, v] of Object.entries(extraFields)) fd.append(k, v);
    }
    const token = readAuthCookie();
    const res = await fetch(`${apiBase}/${path}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
    });
    const env = (await res.json()) as ApiEnvelope<T>;
    if (!res.ok || !env.success) {
        throw new Error(env.response ?? `שגיאה בהעלאת הקובץ (${res.status})`);
    }
    return env;
}

export function BulkUploadView() {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<BulkPreview | null>(null);
    const [result, setResult] = useState<BulkConfirmResult | null>(null);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [defaultCurrency, setDefaultCurrency] = useState("USD");
    const [expirationDate, setExpirationDate] = useState(() => {
        const d = new Date();
        d.setFullYear(d.getFullYear() + 1);
        return d.toISOString().slice(0, 10);
    });

    const onPickFile = (f: File | null) => {
        setFile(f);
        setPreview(null);
        setResult(null);
        setError(null);
    };

    const onPreview = async () => {
        if (!file) return;
        setIsPreviewing(true);
        setError(null);
        try {
            const env = await postFile<BulkPreview>("Company/BulkUpload/Preview", file);
            setPreview(env.data ?? null);
        } catch (e: unknown) {
            const err = e as { message?: string };
            setError(err?.message ?? "שגיאה בעיבוד הקובץ.");
        } finally {
            setIsPreviewing(false);
        }
    };

    const onConfirm = async () => {
        if (!file) return;
        setIsConfirming(true);
        setError(null);
        try {
            const env = await postFile<BulkConfirmResult>(
                "Company/BulkUpload/Confirm",
                file,
                {
                    defaultCurrency,
                    expirationDate: new Date(expirationDate).toISOString(),
                },
            );
            setResult(env.data ?? null);
        } catch (e: unknown) {
            const err = e as { message?: string };
            setError(err?.message ?? "שגיאה באישור ההעלאה.");
        } finally {
            setIsConfirming(false);
        }
    };

    return (
        <div className="space-y-6 py-6" dir="rtl">
            {/* Hero */}
            <motion.header
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-1"
            >
                <p className="text-[10px] uppercase tracking-[0.25em] text-gold-champagne">
                    אזור החברה
                </p>
                <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
                    <span className="text-gradient-skyline">העלאת אקסל לחלוקה המונית</span>
                </h1>
                <p className="text-sm text-text-secondary">
                    העלו קובץ <span className="font-mono">.xlsx</span> או{" "}
                    <span className="font-mono">.csv</span> עם עמודות:
                    שם, דוא״ל, טלפון (אופציונלי), סכום. נציג תצוגה מקדימה
                    לפני שליחת המתנות.
                </p>
                <a
                    href="/templates/bulk-recipients-example.csv"
                    download
                    className="inline-flex items-center gap-1.5 rounded-full border border-gold-champagne/40 bg-gold-champagne/10 px-3 py-1 text-[11px] font-semibold text-gold-champagne transition-colors hover:bg-gold-champagne/20"
                >
                    <Download className="h-3.5 w-3.5" />
                    הורדת תבנית לדוגמה (CSV)
                </a>
            </motion.header>

            {/* Step 1: File picker */}
            <GlassCard padding="lg" tone="elevated" className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                    <FileSpreadsheet className="h-4 w-4 text-gold-champagne" />
                    בחירת קובץ
                </div>
                <label
                    htmlFor="bulk-file"
                    className="flex flex-col items-center justify-center gap-2 cursor-pointer rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.03] py-8 text-center transition-colors hover:border-gold-champagne/60 hover:bg-white/[0.05]"
                >
                    <Upload className="h-6 w-6 text-gold-champagne" />
                    <span className="text-sm text-text-primary">
                        {file ? file.name : "לחצו לבחירת קובץ"}
                    </span>
                    <span className="text-xs text-text-secondary">
                        עד 5MB · סוג: .xlsx או .csv
                    </span>
                    <input
                        id="bulk-file"
                        type="file"
                        accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                        onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                        className="hidden"
                    />
                </label>

                <div className="flex items-center justify-end gap-2">
                    <PrimaryButton
                        type="button"
                        onClick={onPreview}
                        loading={isPreviewing}
                        loadingText="מעבדים…"
                        disabled={!file}
                    >
                        תצוגה מקדימה
                    </PrimaryButton>
                </div>

                {error && (
                    <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                        {error}
                    </p>
                )}
            </GlassCard>

            {/* Step 2: Preview table */}
            {preview && (
                <GlassCard padding="lg" tone="elevated" className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-sm font-semibold text-text-primary">
                            תצוגה מקדימה
                        </h2>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-success">
                                <CheckCircle2 className="h-3 w-3" />
                                {preview.validCount} תקינות
                            </span>
                            {preview.invalidCount > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-danger/30 bg-danger/10 px-2.5 py-0.5 text-danger">
                                    <AlertTriangle className="h-3 w-3" />
                                    {preview.invalidCount} שגויות
                                </span>
                            )}
                            <span className="inline-flex items-center gap-1 rounded-full border border-gold-champagne/30 bg-gold-champagne/10 px-2.5 py-0.5 text-gold-champagne">
                                סה״כ {formatCurrencyDetailed(preview.totalAmount, defaultCurrency)}
                            </span>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-sm">
                            <thead className="text-[10px] uppercase tracking-wider text-text-secondary">
                                <tr>
                                    <th className="px-3 py-2 font-semibold">#</th>
                                    <th className="px-3 py-2 font-semibold">שם</th>
                                    <th className="px-3 py-2 font-semibold">דוא״ל</th>
                                    <th className="px-3 py-2 font-semibold">טלפון</th>
                                    <th className="px-3 py-2 font-semibold">סכום</th>
                                    <th className="px-3 py-2 font-semibold">סטטוס</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {preview.rows.map((r) => (
                                    <tr key={r.rowNumber} className={r.isValid ? "" : "bg-danger/5"}>
                                        <td className="px-3 py-2 font-mono tabular-nums text-text-secondary">
                                            {r.rowNumber}
                                        </td>
                                        <td className="px-3 py-2">{r.name}</td>
                                        <td className="px-3 py-2" dir="ltr">{r.email}</td>
                                        <td className="px-3 py-2" dir="ltr">{r.phone ?? "—"}</td>
                                        <td className="px-3 py-2 font-mono tabular-nums">
                                            {formatCurrencyDetailed(r.amount, r.currency)}
                                        </td>
                                        <td className="px-3 py-2">
                                            {r.isValid ? (
                                                <span className="text-success">תקין</span>
                                            ) : (
                                                <span className="text-danger" title={r.errors.join("; ")}>
                                                    {r.errors[0] ?? "שגוי"}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <TextField
                            label="מטבע ברירת מחדל"
                            value={defaultCurrency}
                            onChange={(e) => setDefaultCurrency(e.target.value.toUpperCase())}
                        />
                        <TextField
                            label="תפוגה"
                            type="date"
                            value={expirationDate}
                            onChange={(e) => setExpirationDate(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2">
                        <GhostButton type="button" onClick={() => setPreview(null)} disabled={isConfirming}>
                            ביטול
                        </GhostButton>
                        <PrimaryButton
                            type="button"
                            onClick={onConfirm}
                            loading={isConfirming}
                            loadingText="שולחים…"
                            disabled={preview.validCount === 0}
                        >
                            <span className="inline-flex items-center gap-2">
                                <Send className="h-4 w-4" />
                                אשר ושלח
                            </span>
                        </PrimaryButton>
                    </div>
                </GlassCard>
            )}

            {/* Step 3: Result */}
            {result && (
                <GlassCard padding="lg" tone="elevated" glow="cyan" className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-success">
                        <CheckCircle2 className="h-5 w-5" />
                        ההעלאה הושלמה
                    </div>
                    <p className="text-sm text-text-secondary">
                        אצווה <span className="font-mono">{result.batchId}</span> · נשלחו{" "}
                        {result.succeededRows} מתוך {result.totalRows} · סה״כ חיוב{" "}
                        {formatCurrencyDetailed(result.totalCharged, defaultCurrency)}
                    </p>
                    {result.failedRows > 0 && (
                        <p className="text-xs text-danger">
                            {result.failedRows} שורות נכשלו. בדקו את היומן לפרטים.
                        </p>
                    )}
                </GlassCard>
            )}
        </div>
    );
}
