"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Users } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { PrimaryButton } from "@/components/ui/Buttons";
import { TextField } from "@/components/ui/FormFields";
import { AirportAutocomplete } from "./AirportAutocomplete";
import { t } from "@/i18n/he";
import type { CabinClass, FlightSearchRequest } from "@/lib/flightTypes";

interface Props {
    initial?: Partial<FlightSearchRequest>;
    isLoading?: boolean;
    onSearch: (req: FlightSearchRequest) => void;
}

const CABIN_OPTIONS: CabinClass[] = ["Economy", "PremiumEconomy", "Business", "First"];

const todayPlus = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
};

export function FlightSearchForm({ initial, isLoading, onSearch }: Props) {
    const [origin, setOrigin] = useState(initial?.origin ?? "TLV");
    const [destination, setDestination] = useState(initial?.destination ?? "JFK");
    const [departureDate, setDepartureDate] = useState(
        initial?.departureDate ?? todayPlus(14)
    );
    const [tripType, setTripType] = useState<"oneWay" | "roundTrip">(
        initial?.returnDate ? "roundTrip" : "oneWay"
    );
    const [returnDate, setReturnDate] = useState(
        initial?.returnDate ?? todayPlus(21)
    );
    const [passengers, setPassengers] = useState(initial?.passengers ?? 1);
    const [cabin, setCabin] = useState<CabinClass>(initial?.cabin ?? "Economy");
    const [errors, setErrors] = useState<Record<string, string>>({});

    const submit = () => {
        const next: Record<string, string> = {};
        if (!origin) next.origin = t.flights.errors.required;
        if (!destination) next.destination = t.flights.errors.required;
        if (origin === destination) next.destination = t.flights.errors.sameAirports;
        if (!departureDate) next.departureDate = t.flights.errors.required;
        if (tripType === "roundTrip") {
            if (!returnDate) next.returnDate = t.flights.errors.required;
            else if (returnDate < departureDate)
                next.returnDate = "תאריך החזרה מוקדם מתאריך היציאה";
        }
        setErrors(next);
        if (Object.keys(next).length) return;

        onSearch({
            origin,
            destination,
            departureDate,
            returnDate: tripType === "roundTrip" ? returnDate : undefined,
            passengers,
            cabin,
        });
    };

    return (
        <GlassCard padding="lg" tone="elevated" glow="cyan" allowOverflow className="space-y-5" dir="rtl">
            <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="space-y-1"
            >
                <p className="text-[10px] uppercase tracking-[0.25em] text-[#0EA5E9] dark:text-cyan-jet">
                    {t.flights.kicker}
                </p>
                <h2 className="font-display text-2xl font-semibold text-[#0F172A] dark:text-gradient-skyline">
                    {t.flights.heroTitle}
                </h2>
            </motion.div>

            {/* Trip-type toggle */}
            <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1">
                <button
                    type="button"
                    onClick={() => setTripType("oneWay")}
                    className={`inline-flex h-11 items-center rounded-full px-5 text-sm font-medium transition-all ${tripType === "oneWay"
                        ? "bg-cyan-jet/20 text-cyan-glow border border-cyan-jet/40"
                        : "text-text-secondary hover:text-text-primary"
                        }`}
                >
                    {t.flights.oneWay}
                </button>
                <button
                    type="button"
                    onClick={() => setTripType("roundTrip")}
                    className={`inline-flex h-11 items-center rounded-full px-5 text-sm font-medium transition-all ${tripType === "roundTrip"
                        ? "bg-cyan-jet/20 text-cyan-glow border border-cyan-jet/40"
                        : "text-text-secondary hover:text-text-primary"
                        }`}
                >
                    {t.flights.roundTrip}
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <AirportAutocomplete
                    label={t.flights.from}
                    value={origin}
                    onChange={setOrigin}
                    error={errors.origin}
                    iconTone="cyan"
                />
                <AirportAutocomplete
                    label={t.flights.to}
                    value={destination}
                    onChange={setDestination}
                    error={errors.destination}
                    iconTone="violet"
                />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5 sm:col-span-1">
                    <label className="block text-xs font-medium uppercase tracking-wider text-[#475569] dark:text-text-secondary text-start">
                        {t.flights.depart}
                    </label>
                    <div className="relative">
                        <Calendar className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#475569] dark:text-text-secondary" />
                        <input
                            type="date"
                            value={departureDate}
                            min={todayPlus(0)}
                            onChange={(e) => setDepartureDate(e.target.value)}
                            className="w-full rounded-xl border border-[#0F172A]/20 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] pr-10 pl-3 py-3 text-base text-[#0F172A] dark:text-text-primary focus:outline-none focus:border-cyan-jet/60 focus:bg-white/90 dark:focus:bg-white/[0.06] focus:shadow-[0_0_0_4px_rgba(0,229,255,0.12)]"
                        />
                    </div>
                    {errors.departureDate && (
                        <p className="text-xs text-danger">{errors.departureDate}</p>
                    )}
                </div>

                {tripType === "roundTrip" && (
                    <div className="space-y-1.5 sm:col-span-1">
                        <label className="block text-xs font-medium uppercase tracking-wider text-[#475569] dark:text-text-secondary text-start">
                            {t.flights.returnDate}
                        </label>
                        <div className="relative">
                            <Calendar className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#475569] dark:text-text-secondary" />
                            <input
                                type="date"
                                value={returnDate}
                                min={departureDate}
                                onChange={(e) => setReturnDate(e.target.value)}
                                className="w-full rounded-xl border border-[#0F172A]/20 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] pr-10 pl-3 py-3 text-base text-[#0F172A] dark:text-text-primary focus:outline-none focus:border-cyan-jet/60 focus:bg-white/90 dark:focus:bg-white/[0.06] focus:shadow-[0_0_0_4px_rgba(0,229,255,0.12)]"
                            />
                        </div>
                        {errors.returnDate && (
                            <p className="text-xs text-danger">{errors.returnDate}</p>
                        )}
                    </div>
                )}

                <TextField
                    label={t.flights.passengers}
                    type="number"
                    min={1}
                    max={9}
                    value={passengers}
                    onChange={(e) => setPassengers(Math.max(1, +e.target.value || 1))}
                />

                <div className="space-y-1.5">
                    <label className="block text-xs font-medium uppercase tracking-wider text-[#475569] dark:text-text-secondary text-start">
                        {t.flights.cabin}
                    </label>
                    <select
                        value={cabin}
                        onChange={(e) => setCabin(e.target.value as CabinClass)}
                        className="w-full rounded-xl border border-[#0F172A]/20 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] px-4 py-3 text-base text-[#0F172A] dark:text-text-primary focus:outline-none focus:border-cyan-jet/60 focus:bg-white/90 dark:focus:bg-white/[0.06] focus:shadow-[0_0_0_4px_rgba(0,229,255,0.12)]"
                    >
                        {CABIN_OPTIONS.map((c) => (
                            <option key={c} value={c} className="bg-bg-elevated">
                                {t.flights.cabinOptions[c] ?? c}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <PrimaryButton
                type="button"
                onClick={submit}
                loading={isLoading}
                loadingText={t.flights.searching}
            >
                <span className="inline-flex items-center justify-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{t.flights.searchCta}</span>
                    <ArrowLeft className="h-4 w-4" />
                </span>
            </PrimaryButton>
        </GlassCard>
    );
}
