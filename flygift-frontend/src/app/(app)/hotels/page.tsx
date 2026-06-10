"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Hotel,
    Search,
    Users,
    Star,
    MapPin,
    Wifi,
    Sparkles,
    CheckCircle2,
    X,
    CreditCard,
    Wallet,
    ShieldCheck,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { PrimaryButton, GhostButton } from "@/components/ui/Buttons";
import { TextField, DateField } from "@/components/ui/FormFields";
import { ApiUtils } from "@/utils/ApiUtils";
import { formatCurrencyDetailed } from "@/utils/format";
import { t } from "@/i18n/he";
import { cn } from "@/utils/cn";
import { recordSpend } from "@/lib/appStore";

// ----- Types mirror backend HotelOffer / HotelSearchResponse -----
interface HotelOffer {
    id: string;
    name: string;
    city: string;
    country: string;
    imageUrl: string;
    rating: number;
    reviewCount: number;
    amenities: string[];
    nightlyRate: number;
    totalPrice: number;
    currency: string;
    affordableFromBalance: boolean;
    cardTopUpRequired: number;
}

interface SearchResponse {
    searchId: string;
    nights: number;
    city: string;
    accountBalance: number;
    currency: string;
    offers: HotelOffer[];
}

interface BookResult {
    bookingId: number;
    reference: string;
    hotelName: string;
    city: string;
    nights: number;
    totalCharged: number;
    paidFromBalance: number;
    paidFromCard: number;
    remainingBalance: number;
    currency: string;
}

const todayPlus = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
};

export default function HotelsPage() {
    const [city, setCity] = useState("Tel Aviv");
    const [checkIn, setCheckIn] = useState(todayPlus(7));
    const [checkOut, setCheckOut] = useState(todayPlus(10));
    const [guests, setGuests] = useState(2);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<SearchResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<HotelOffer | null>(null);

    const onSearch = async () => {
        setError(null);
        setLoading(true);
        setData(null);
        try {
            const params = new URLSearchParams({
                city,
                checkIn,
                checkOut,
                guests: String(guests),
            });
            const res = (await ApiUtils.get(
                `HotelSearch?${params.toString()}`
            ).startRequest()) as {
                success?: boolean;
                Success?: boolean;
                data?: SearchResponse;
                Data?: SearchResponse;
                response?: string;
                Response?: string;
            };
            const ok = res.success ?? res.Success;
            if (ok === false) {
                throw new Error(res.response || res.Response || t.common.searchFailed);
            }
            setData((res.data ?? res.Data) as SearchResponse);
        } catch (e) {
            setError(e instanceof Error ? e.message : t.common.searchFailed);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 py-6" dir="rtl">
            {/* Hero + search */}
            <motion.header
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-1"
            >
                <p className="text-[10px] uppercase tracking-[0.25em] text-[#0EA5E9] dark:text-gold-champagne">
                    {t.hotels.kicker}
                </p>
                <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#0F172A] dark:text-text-primary">
                    <span className="dark:text-gradient-skyline">{t.hotels.title}</span>
                </h1>
                <p className="text-sm text-text-secondary">{t.hotels.subtitle}</p>
            </motion.header>

            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
            >
                <GlassCard padding="lg" tone="elevated" glow="gold" className="space-y-4">
                    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_0.7fr]">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-medium uppercase tracking-wider text-[#475569] dark:text-text-secondary text-start">
                                {t.hotels.cityLabel}
                            </label>
                            <div className="relative">
                                <MapPin className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gold-champagne" />
                                <input
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    placeholder={t.hotels.cityPlaceholder}
                                    className="w-full rounded-xl border border-[#0F172A]/20 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] pr-10 pl-3 py-3 text-base text-[#0F172A] dark:text-text-primary placeholder:text-[#0F172A]/40 dark:placeholder:text-text-secondary/60 focus:outline-none focus:border-gold-champagne/60 focus:bg-white/90 dark:focus:bg-white/[0.06] focus:shadow-[0_0_0_4px_rgba(212,175,122,0.16)]"
                                />
                            </div>
                        </div>
                        <DateField
                            label={t.hotels.checkInLabel}
                            value={checkIn}
                            min={todayPlus(0)}
                            onChange={setCheckIn}
                        />
                        <DateField
                            label={t.hotels.checkOutLabel}
                            value={checkOut}
                            min={checkIn}
                            onChange={setCheckOut}
                        />
                        <TextField
                            label={t.hotels.guestsLabel}
                            type="number"
                            min={1}
                            max={9}
                            value={guests}
                            onChange={(e) => setGuests(Math.max(1, +e.target.value || 1))}
                        />
                    </div>

                    <PrimaryButton
                        type="button"
                        onClick={onSearch}
                        loading={loading}
                        loadingText={t.hotels.searching}
                    >
                        <span className="inline-flex items-center gap-2">
                            <Search className="h-4 w-4" />
                            {t.hotels.searchCta}
                        </span>
                    </PrimaryButton>
                    {error && <p className="text-sm text-danger">{error}</p>}
                </GlassCard>
            </motion.div>

            {/* Results */}
            {data && (
                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-text-secondary">
                            {data.offers.length} · {data.city} ·{" "}
                            {t.hotels.nights(data.nights)}
                        </p>
                        <p className="text-xs text-text-secondary">
                            {t.trips.availableBalance}:{" "}
                            <span className="font-mono text-text-primary">
                                {formatCurrencyDetailed(data.accountBalance, data.currency)}
                            </span>
                        </p>
                    </div>

                    {data.offers.length === 0 ? (
                        <GlassCard padding="lg" className="text-center text-text-secondary">
                            <Hotel className="mx-auto h-6 w-6 text-text-secondary/60" />
                            <p className="mt-2 text-sm">{t.hotels.noResults}</p>
                        </GlassCard>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {data.offers.map((o, i) => (
                                <HotelOfferCard
                                    key={o.id}
                                    offer={o}
                                    nights={data.nights}
                                    index={i}
                                    onSelect={() => setSelected(o)}
                                />
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* Booking modal (split-payment) */}
            <AnimatePresence>
                {selected && data && (
                    <BookHotelModal
                        offer={selected}
                        nights={data.nights}
                        balance={data.accountBalance}
                        onClose={() => setSelected(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function HotelOfferCard({
    offer,
    nights,
    index,
    onSelect,
}: {
    offer: HotelOffer;
    nights: number;
    index: number;
    onSelect: () => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.04 }}
        >
            <GlassCard
                padding="none"
                interactive
                glow={offer.affordableFromBalance ? "gold" : "none"}
                onClick={onSelect}
                className="overflow-hidden"
            >
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-white/[0.04]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={offer.imageUrl}
                        alt={offer.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                    />
                    <div className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-bg-base/70 backdrop-blur px-2 py-0.5 text-[11px] font-mono text-text-primary">
                        <Star className="h-3 w-3 text-gold-champagne" />
                        {offer.rating.toFixed(1)}
                        <span className="text-text-secondary">·</span>
                        <span className="text-text-secondary">
                            {t.hotels.reviews(offer.reviewCount)}
                        </span>
                    </div>
                    <div className="absolute top-3 right-3">
                        <span
                            className={cn(
                                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                                offer.affordableFromBalance
                                    ? "border-gold-champagne/40 bg-gold-champagne/15 text-gold-champagne"
                                    : "border-white/10 bg-white/[0.06] text-text-secondary"
                            )}
                        >
                            <Sparkles className="h-3 w-3" />
                            {offer.affordableFromBalance
                                ? t.hotels.affordable
                                : t.hotels.partial}
                        </span>
                    </div>
                </div>

                <div className="p-4 space-y-3">
                    <div>
                        <h3 className="font-display text-lg font-semibold">{offer.name}</h3>
                        <p className="text-xs text-text-secondary">
                            {offer.city}
                            {offer.country && offer.country !== "—" && ` · ${offer.country}`}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                        {offer.amenities.slice(0, 4).map((a) => (
                            <span
                                key={a}
                                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] text-text-secondary"
                            >
                                <Wifi className="h-3 w-3" />
                                {a}
                            </span>
                        ))}
                    </div>

                    <div className="flex items-end justify-between border-t border-white/[0.06] pt-3">
                        <div>
                            <p className="text-[10px] uppercase tracking-wider text-text-secondary">
                                {t.hotels.from} · {t.hotels.perNight}
                            </p>
                            <p className="font-mono text-xl font-semibold tabular-nums">
                                {formatCurrencyDetailed(offer.nightlyRate, offer.currency)}
                            </p>
                            <p className="text-[10px] text-text-secondary">
                                {formatCurrencyDetailed(offer.totalPrice, offer.currency)} ·{" "}
                                {t.hotels.nights(nights)}
                            </p>
                        </div>
                        <PrimaryButton
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelect();
                            }}
                            className="!w-auto !h-10 !px-4 text-sm"
                        >
                            {t.hotels.bookCta}
                        </PrimaryButton>
                    </div>
                </div>
            </GlassCard>
        </motion.div>
    );
}

function BookHotelModal({
    offer,
    nights,
    balance,
    onClose,
}: {
    offer: HotelOffer;
    nights: number;
    balance: number;
    onClose: () => void;
}) {
    const fromBalance = Math.min(balance, offer.totalPrice);
    const fromCard = +(offer.totalPrice - fromBalance).toFixed(2);
    const needsCard = fromCard > 0;

    const [guestName, setGuestName] = useState("");
    const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<BookResult | null>(null);

    const submit = async () => {
        setError(null);
        if (!guestName.trim()) {
            setError(t.flights.errors.required);
            return;
        }
        const token = needsCard
            ? cardNumber.replace(/\s+/g, "").startsWith("4000")
                ? "pm_test_decline"
                : "pm_test_visa"
            : undefined;

        setLoading(true);
        try {
            const res = (await ApiUtils.post("HotelSearch/Book", {
                OfferId: offer.id,
                GuestName: guestName,
                PaymentMethodToken: token,
            }).startRequest()) as {
                success?: boolean;
                Success?: boolean;
                data?: BookResult;
                Data?: BookResult;
                response?: string;
                Response?: string;
            };
            const ok = res.success ?? res.Success;
            if (ok === false) {
                throw new Error(res.response || res.Response || t.common.bookingFailed);
            }
            const booked = (res.data ?? res.Data) as BookResult;
            setResult(booked);
            // Sync wallet ledger so the dashboard balance and history reflect this spend.
            if (booked && (booked.paidFromBalance ?? 0) > 0) {
                recordSpend({
                    amount: booked.paidFromBalance,
                    currency: booked.currency,
                    description: `${offer.name} (${offer.city}) · ${t.hotels.nights(nights)}`,
                    reference: `booking:hotel-${booked.bookingId}`,
                });
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : t.common.bookingFailed);
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-bg-base/80 backdrop-blur-sm px-4 py-8"
            onClick={onClose}
            dir="rtl"
        >
            <motion.div
                initial={{ y: 16, opacity: 0, scale: 0.97 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 8, opacity: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 22 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg"
            >
                <GlassCard padding="lg" tone="elevated" glow="gold" className="relative space-y-5 !bg-white dark:!bg-bg-elevated border border-[#0F172A]/10 dark:border-white/10 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.4)]">
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={t.common.close}
                        className="absolute -top-3 -left-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-bg-base/90 text-text-secondary hover:text-text-primary"
                    >
                        <X className="h-4 w-4" />
                    </button>

                    {result ? (
                        <div className="space-y-4 text-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/20 shadow-glow-success">
                                <CheckCircle2 className="h-8 w-8 text-success" />
                            </div>
                            <h2 className="font-display text-2xl font-semibold">
                                {t.hotels.bookingSuccess}
                            </h2>
                            <p className="text-sm text-text-secondary">
                                {result.hotelName} · {result.city} ·{" "}
                                {t.hotels.nights(result.nights)}
                            </p>
                            <p className="font-mono text-xs text-text-secondary">
                                {t.hotels.bookingRef(result.reference)}
                            </p>
                            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm space-y-2">
                                <Row
                                    label={t.flights.paidFromBalance}
                                    value={`−${formatCurrencyDetailed(result.paidFromBalance, result.currency)}`}
                                    tone="success"
                                />
                                {result.paidFromCard > 0 && (
                                    <Row
                                        label={t.flights.paidFromCard}
                                        value={formatCurrencyDetailed(result.paidFromCard, result.currency)}
                                    />
                                )}
                                <div className="border-t border-white/10" />
                                <Row
                                    label={t.flights.remainingBalance}
                                    value={formatCurrencyDetailed(result.remainingBalance, result.currency)}
                                    bold
                                />
                            </div>
                            <PrimaryButton type="button" onClick={onClose}>
                                {t.common.done}
                            </PrimaryButton>
                        </div>
                    ) : (
                        <>
                            <div>
                                <p className="text-[10px] uppercase tracking-[0.25em] text-gold-champagne">
                                    {t.hotels.bookingTitle}
                                </p>
                                <h2 className="font-display text-2xl font-semibold text-gradient-skyline">
                                    {offer.name}
                                </h2>
                                <p className="mt-1 text-sm text-text-secondary">
                                    {t.hotels.bookingFor(offer.city, nights)}
                                </p>
                            </div>

                            <TextField
                                label={t.hotels.guestName}
                                value={guestName}
                                onChange={(e) => setGuestName(e.target.value)}
                                placeholder={t.flights.nameSample}
                            />

                            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3 text-sm">
                                <Row
                                    label={t.flights.total}
                                    value={formatCurrencyDetailed(offer.totalPrice, offer.currency)}
                                    bold
                                />
                                <div className="flex items-center gap-3">
                                    <Wallet className="h-4 w-4 text-cyan-jet" />
                                    <span className="text-text-primary">{t.flights.giftCardBalance}</span>
                                    <span className="ms-auto font-mono text-success tabular-nums">
                                        −{formatCurrencyDetailed(fromBalance, offer.currency)}
                                    </span>
                                </div>
                                {needsCard ? (
                                    <>
                                        <div className="flex items-center gap-3">
                                            <CreditCard className="h-4 w-4 text-violet-aurora" />
                                            <span className="text-text-primary">{t.flights.cardCharge}</span>
                                            <span className="ms-auto font-mono tabular-nums">
                                                {formatCurrencyDetailed(fromCard, offer.currency)}
                                            </span>
                                        </div>
                                        <TextField
                                            label={t.flights.cardNumber}
                                            value={cardNumber}
                                            onChange={(e) => setCardNumber(e.target.value)}
                                            placeholder="4242 4242 4242 4242"
                                            hint={t.flights.cardHint}
                                        />
                                    </>
                                ) : (
                                    <p className="text-xs text-success inline-flex items-center gap-1">
                                        <ShieldCheck className="h-3.5 w-3.5" />
                                        {t.flights.fullyCovered}
                                    </p>
                                )}
                            </div>

                            {error && <p className="text-sm text-danger">{error}</p>}

                            <div className="flex gap-3">
                                <GhostButton type="button" onClick={onClose} disabled={loading}>
                                    {t.common.cancel}
                                </GhostButton>
                                <div className="flex-1">
                                    <PrimaryButton
                                        type="button"
                                        onClick={submit}
                                        loading={loading}
                                        loadingText={t.hotels.booking}
                                    >
                                        <Users className="h-4 w-4" />
                                        {t.hotels.confirmAndPay(
                                            formatCurrencyDetailed(offer.totalPrice, offer.currency)
                                        )}
                                    </PrimaryButton>
                                </div>
                            </div>
                        </>
                    )}
                </GlassCard>
            </motion.div>
        </motion.div>
    );
}

function Row({
    label,
    value,
    bold,
    tone,
}: {
    label: string;
    value: string;
    bold?: boolean;
    tone?: "success";
}) {
    return (
        <div className="flex items-center justify-between">
            <span className={cn("text-text-secondary", bold && "text-text-primary")}>
                {label}
            </span>
            <span
                className={cn(
                    "font-mono tabular-nums",
                    bold ? "text-base font-semibold" : "text-sm",
                    tone === "success" && "text-success"
                )}
            >
                {value}
            </span>
        </div>
    );
}
