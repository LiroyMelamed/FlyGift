"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, BookUser } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { TextField, DateField } from "@/components/ui/FormFields";
import { PrimaryButton, GhostButton } from "@/components/ui/Buttons";
import { t } from "@/i18n/he";

export interface PassengerDetails {
    firstName: string;
    lastName: string;
    passportNumber: string;
    passportExpiry: string; // yyyy-mm-dd
    birthDate: string; // yyyy-mm-dd
}

interface Props {
    initial?: PassengerDetails[];
    /** How many passenger forms to render. Pulled from the search request. */
    count: number;
    /** Earliest date the passenger could fly — used to validate passport expiry. */
    departureDate: string;
    onSubmit: (details: PassengerDetails[]) => void;
    onBack: () => void;
}

const LATIN_NAME_RE = /^[A-Z][A-Z\s'-]{0,40}$/i;
const PASSPORT_RE = /^[A-Z0-9]{5,15}$/i;
const todayISO = () => new Date().toISOString().slice(0, 10);
const addMonths = (iso: string, m: number) => {
    const d = new Date(iso);
    d.setMonth(d.getMonth() + m);
    return d.toISOString().slice(0, 10);
};

const blank = (): PassengerDetails => ({
    firstName: "",
    lastName: "",
    passportNumber: "",
    passportExpiry: "",
    birthDate: "",
});

export function PassengerDetailsStep({
    initial,
    count,
    departureDate,
    onSubmit,
    onBack,
}: Props) {
    const [list, setList] = useState<PassengerDetails[]>(() => {
        const seed = initial ?? [];
        return Array.from({ length: Math.max(1, count) }, (_, i) => seed[i] ?? blank());
    });
    const [errors, setErrors] = useState<Record<number, Record<string, string>>>({});
    const [warnings, setWarnings] = useState<Record<number, Record<string, string>>>({});

    const update = (i: number, patch: Partial<PassengerDetails>) => {
        setList((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
    };

    const validateOne = (
        p: PassengerDetails,
    ): { e: Record<string, string>; w: Record<string, string> } => {
        const e: Record<string, string> = {};
        const w: Record<string, string> = {};

        if (!p.firstName.trim()) e.firstName = t.flights.errors.required;
        else if (!LATIN_NAME_RE.test(p.firstName.trim()))
            e.firstName = t.flights.passengerStep.errors.latinOnly;

        if (!p.lastName.trim()) e.lastName = t.flights.errors.required;
        else if (!LATIN_NAME_RE.test(p.lastName.trim()))
            e.lastName = t.flights.passengerStep.errors.latinOnly;

        if (!p.passportNumber.trim()) e.passportNumber = t.flights.errors.required;
        else if (!PASSPORT_RE.test(p.passportNumber.trim()))
            e.passportNumber = t.flights.passengerStep.errors.passportFormat;

        if (!p.passportExpiry) e.passportExpiry = t.flights.errors.required;
        else if (p.passportExpiry < departureDate)
            e.passportExpiry = t.flights.passengerStep.errors.passportExpired;
        else if (p.passportExpiry < addMonths(departureDate, 6))
            w.passportExpiry = t.flights.passengerStep.errors.passportSoonExpire;

        if (!p.birthDate) e.birthDate = t.flights.errors.required;
        else if (p.birthDate > todayISO())
            e.birthDate = t.flights.passengerStep.errors.birthDateFuture;
        else {
            const ageMs = Date.now() - new Date(p.birthDate).getTime();
            const years = ageMs / (365.25 * 24 * 3600 * 1000);
            if (years < 2) e.birthDate = t.flights.passengerStep.errors.tooYoung;
        }

        return { e, w };
    };

    const submit = () => {
        const allErrors: Record<number, Record<string, string>> = {};
        const allWarnings: Record<number, Record<string, string>> = {};
        let invalid = false;
        list.forEach((p, i) => {
            const { e, w } = validateOne(p);
            if (Object.keys(e).length > 0) invalid = true;
            allErrors[i] = e;
            allWarnings[i] = w;
        });
        setErrors(allErrors);
        setWarnings(allWarnings);
        if (invalid) return;

        onSubmit(
            list.map((p) => ({
                firstName: p.firstName.trim().toUpperCase(),
                lastName: p.lastName.trim().toUpperCase(),
                passportNumber: p.passportNumber.trim().toUpperCase(),
                passportExpiry: p.passportExpiry,
                birthDate: p.birthDate,
            })),
        );
    };

    return (
        <div className="mx-auto max-w-2xl space-y-5 py-6" dir="rtl">
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
                <p className="text-[10px] uppercase tracking-[0.25em] text-cyan-deep dark:text-cyan-jet">
                    {t.flights.passengerStep.kicker}
                </p>
                <h1 className="font-display text-2xl font-semibold text-gradient-skyline">
                    {t.flights.passengerStep.title}
                </h1>
                <p className="mt-1 text-sm text-text-secondary">
                    {t.flights.passengerStep.subtitle}
                </p>
            </motion.div>

            {list.map((p, i) => (
                <PassengerCard
                    key={i}
                    index={i}
                    total={list.length}
                    value={p}
                    onChange={(patch) => update(i, patch)}
                    errors={errors[i] ?? {}}
                    warnings={warnings[i] ?? {}}
                />
            ))}

            <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <GhostButton type="button" onClick={onBack} className="sm:w-auto">
                    <ArrowLeft className="h-4 w-4" />
                    {t.flights.passengerStep.backCta}
                </GhostButton>
                <div className="flex-1">
                    <PrimaryButton type="button" onClick={submit}>
                        {t.flights.passengerStep.continueCta}
                    </PrimaryButton>
                </div>
            </div>
        </div>
    );
}

function PassengerCard({
    index,
    total,
    value,
    onChange,
    errors,
    warnings,
}: {
    index: number;
    total: number;
    value: PassengerDetails;
    onChange: (patch: Partial<PassengerDetails>) => void;
    errors: Record<string, string>;
    warnings: Record<string, string>;
}) {
    return (
        <GlassCard padding="lg" tone="elevated" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-deep/10 text-cyan-deep dark:bg-cyan-jet/10 dark:text-cyan-jet">
                        <BookUser className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-wider text-text-secondary">
                            נוסע {index + 1} מתוך {total}
                        </p>
                        <p className="text-sm text-text-primary">
                            {t.flights.passengerStep.subtitle}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField
                    label={t.flights.passengerStep.firstName}
                    value={value.firstName}
                    onChange={(e) => onChange({ firstName: e.target.value })}
                    placeholder={t.flights.passengerStep.firstNameSample}
                    error={errors.firstName}
                    autoComplete="given-name"
                    inputMode="text"
                    dir="ltr"
                />
                <TextField
                    label={t.flights.passengerStep.lastName}
                    value={value.lastName}
                    onChange={(e) => onChange({ lastName: e.target.value })}
                    placeholder={t.flights.passengerStep.lastNameSample}
                    error={errors.lastName}
                    autoComplete="family-name"
                    inputMode="text"
                    dir="ltr"
                />
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-3">
                <TextField
                    label={t.flights.passengerStep.passportNumber}
                    value={value.passportNumber}
                    onChange={(e) => onChange({ passportNumber: e.target.value })}
                    placeholder={t.flights.passengerStep.passportSample}
                    error={errors.passportNumber}
                    dir="ltr"
                />
                <DateField
                    label={t.flights.passengerStep.passportExpiry}
                    value={value.passportExpiry}
                    onChange={(v) => onChange({ passportExpiry: v })}
                    min={todayISO()}
                    error={errors.passportExpiry}
                    warning={warnings.passportExpiry}
                />
                <DateField
                    label={t.flights.passengerStep.birthDate}
                    value={value.birthDate}
                    onChange={(v) => onChange({ birthDate: v })}
                    max={todayISO()}
                    error={errors.birthDate}
                />
            </div>
        </GlassCard>
    );
}
