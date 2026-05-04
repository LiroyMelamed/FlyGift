"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, BookUser } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { TextField } from "@/components/ui/FormFields";
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
    initial?: Partial<PassengerDetails>;
    /** Earliest date the passenger could fly — used to validate passport expiry. */
    departureDate: string;
    onSubmit: (details: PassengerDetails) => void;
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

export function PassengerDetailsStep({
    initial,
    departureDate,
    onSubmit,
    onBack,
}: Props) {
    const [firstName, setFirstName] = useState(initial?.firstName ?? "");
    const [lastName, setLastName] = useState(initial?.lastName ?? "");
    const [passportNumber, setPassportNumber] = useState(
        initial?.passportNumber ?? ""
    );
    const [passportExpiry, setPassportExpiry] = useState(
        initial?.passportExpiry ?? ""
    );
    const [birthDate, setBirthDate] = useState(initial?.birthDate ?? "");
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [warnings, setWarnings] = useState<Record<string, string>>({});

    const validate = (): boolean => {
        const e: Record<string, string> = {};
        const w: Record<string, string> = {};

        if (!firstName.trim()) e.firstName = t.flights.errors.required;
        else if (!LATIN_NAME_RE.test(firstName.trim()))
            e.firstName = t.flights.passengerStep.errors.latinOnly;

        if (!lastName.trim()) e.lastName = t.flights.errors.required;
        else if (!LATIN_NAME_RE.test(lastName.trim()))
            e.lastName = t.flights.passengerStep.errors.latinOnly;

        if (!passportNumber.trim())
            e.passportNumber = t.flights.errors.required;
        else if (!PASSPORT_RE.test(passportNumber.trim()))
            e.passportNumber = t.flights.passengerStep.errors.passportFormat;

        if (!passportExpiry) e.passportExpiry = t.flights.errors.required;
        else {
            // Must be after departure date
            if (passportExpiry < departureDate)
                e.passportExpiry =
                    t.flights.passengerStep.errors.passportExpired;
            else if (passportExpiry < addMonths(departureDate, 6))
                w.passportExpiry =
                    t.flights.passengerStep.errors.passportSoonExpire;
        }

        if (!birthDate) e.birthDate = t.flights.errors.required;
        else {
            if (birthDate > todayISO())
                e.birthDate = t.flights.passengerStep.errors.birthDateFuture;
            else {
                const ageMs = Date.now() - new Date(birthDate).getTime();
                const years = ageMs / (365.25 * 24 * 3600 * 1000);
                if (years < 2)
                    e.birthDate = t.flights.passengerStep.errors.tooYoung;
            }
        }

        setErrors(e);
        setWarnings(w);
        return Object.keys(e).length === 0;
    };

    const submit = () => {
        if (!validate()) return;
        onSubmit({
            firstName: firstName.trim().toUpperCase(),
            lastName: lastName.trim().toUpperCase(),
            passportNumber: passportNumber.trim().toUpperCase(),
            passportExpiry,
            birthDate,
        });
    };

    return (
        <div className="mx-auto max-w-2xl space-y-5 py-6" dir="rtl">
            <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
            >
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

            <GlassCard padding="lg" tone="elevated" className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-deep/10 text-cyan-deep dark:bg-cyan-jet/10 dark:text-cyan-jet">
                        <BookUser className="h-5 w-5" />
                    </div>
                    <p className="text-sm text-text-secondary">
                        {t.flights.passengerStep.subtitle}
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <TextField
                        label={t.flights.passengerStep.firstName}
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder={t.flights.passengerStep.firstNameSample}
                        error={errors.firstName}
                        autoComplete="given-name"
                        // Latin-only: hint browsers to use English keyboard
                        inputMode="text"
                        dir="ltr"
                    />
                    <TextField
                        label={t.flights.passengerStep.lastName}
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder={t.flights.passengerStep.lastNameSample}
                        error={errors.lastName}
                        autoComplete="family-name"
                        inputMode="text"
                        dir="ltr"
                    />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <TextField
                        label={t.flights.passengerStep.passportNumber}
                        value={passportNumber}
                        onChange={(e) => setPassportNumber(e.target.value)}
                        placeholder={t.flights.passengerStep.passportSample}
                        error={errors.passportNumber}
                        dir="ltr"
                    />
                    <DateField
                        label={t.flights.passengerStep.passportExpiry}
                        value={passportExpiry}
                        onChange={setPassportExpiry}
                        min={todayISO()}
                        error={errors.passportExpiry}
                        warning={warnings.passportExpiry}
                    />
                    <DateField
                        label={t.flights.passengerStep.birthDate}
                        value={birthDate}
                        onChange={setBirthDate}
                        max={todayISO()}
                        error={errors.birthDate}
                    />
                </div>
            </GlassCard>

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

function DateField({
    label,
    value,
    onChange,
    min,
    max,
    error,
    warning,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    min?: string;
    max?: string;
    error?: string;
    warning?: string;
}) {
    return (
        <div className="space-y-1.5">
            <label className="block text-xs font-medium uppercase tracking-wider text-[#475569] dark:text-text-secondary">
                {label}
            </label>
            <input
                type="date"
                value={value}
                min={min}
                max={max}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-xl border border-[#0F172A]/20 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] px-3 py-3 text-base text-[#0F172A] dark:text-text-primary focus:outline-none focus:border-cyan-jet/60 focus:bg-white/90 dark:focus:bg-white/[0.06] focus:shadow-[0_0_0_4px_rgba(14,165,233,0.12)]"
            />
            {error && <p className="text-xs text-danger">{error}</p>}
            {!error && warning && (
                <p className="text-xs text-warning">{warning}</p>
            )}
        </div>
    );
}
