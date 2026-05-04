"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, Plane } from "lucide-react";
import { GhostButton } from "@/components/ui/Buttons";
import { useFlightSearch } from "@/hooks/useFlightSearch";
import { useBookFlight } from "@/hooks/useBookFlight";
import { nativeBridge } from "@/utils/nativeBridge";
import { useAppDerived, recordSpend } from "@/lib/appStore";
import { FlightSearchForm } from "./FlightSearchForm";
import { FlightResultsList } from "./FlightResultsList";
import { CheckoutSummary } from "./CheckoutSummary";
import { TicketIssued } from "./TicketIssued";
import {
    FlightFilters,
    applyFlightFilters,
    buildInitialFilters,
    type FlightFilterState,
} from "./FlightFilters";
import { PassengerDetailsStep, type PassengerDetails } from "./PassengerDetailsStep";
import { mockFlightApi } from "@/lib/mockFlights";
import { t } from "@/i18n/he";
import type { FlightOffer, FlightSearchRequest } from "@/lib/flightTypes";

type Step = "search" | "results" | "passenger" | "checkout" | "issued";
type Leg = "outbound" | "return";

/**
 * Combine an outbound + return single-slice offer into one round-trip
 * offer with two slices and summed pricing. The synthetic id encodes
 * both originals so the Ticket screen can reference either leg.
 */
function combineOffers(out: FlightOffer, ret: FlightOffer): FlightOffer {
    const total = +(out.price.total + ret.price.total).toFixed(2);
    const base = +(out.price.base + ret.price.base).toFixed(2);
    const taxes = +(out.price.taxes + ret.price.taxes).toFixed(2);
    const median = +(out.price.marketMedian + ret.price.marketMedian).toFixed(2);
    return {
        id: `combo:${out.id}+${ret.id}`,
        source: out.source,
        carrier: out.carrier,
        slices: [out.slices[0], ret.slices[0]],
        price: {
            base,
            taxes,
            total,
            currency: out.price.currency,
            marketMedian: median,
        },
        totalDurationMinutes:
            out.totalDurationMinutes + ret.totalDurationMinutes,
        stops: Math.max(out.stops, ret.stops),
        isBestPrice: out.isBestPrice && ret.isBestPrice,
        bestPriceReason: out.bestPriceReason ?? ret.bestPriceReason ?? null,
        expiresAt:
            new Date(out.expiresAt) < new Date(ret.expiresAt)
                ? out.expiresAt
                : ret.expiresAt,
    };
}

function formatTimeLabel(iso: string) {
    return new Date(iso).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

/**
 * End-to-end booking flow: search → compare → checkout → ticket issued.
 * Round-trip uses a two-step selection: outbound first, then return.
 */
export function FlightBookingFlow() {
    const [step, setStep] = useState<Step>("search");
    const [selected, setSelected] = useState<FlightOffer | null>(null);
    const [bookError, setBookError] = useState<string | null>(null);
    const { totalBalance, user } = useAppDerived();

    // Outbound search (first leg, or only leg for one-way)
    const {
        search: searchOutbound,
        isLoading: isSearchingOutbound,
        data: outboundData,
        lastRequest,
    } = useFlightSearch();

    // Return search (only used when round-trip)
    const [returnOffers, setReturnOffers] = useState<FlightOffer[] | null>(null);
    const [isSearchingReturn, setIsSearchingReturn] = useState(false);
    const [activeLeg, setActiveLeg] = useState<Leg>("outbound");
    const [outboundOffer, setOutboundOffer] = useState<FlightOffer | null>(null);

    // Filter state — rebuilt whenever the visible offer list changes (per leg).
    const [outboundFilters, setOutboundFilters] = useState<FlightFilterState | null>(
        null
    );
    const [returnFilters, setReturnFilters] = useState<FlightFilterState | null>(
        null
    );

    // Passenger details collected before checkout
    const [passenger, setPassenger] = useState<PassengerDetails | null>(null);

    const { book, isLoading: isBooking, result, reset } = useBookFlight();

    const isRoundTrip = !!lastRequest?.returnDate;

    const goSearch = async (req: FlightSearchRequest) => {
        nativeBridge.haptic("light");
        // Reset round-trip + filter state on every new search
        setOutboundOffer(null);
        setReturnOffers(null);
        setActiveLeg("outbound");
        setOutboundFilters(null);
        setReturnFilters(null);
        setPassenger(null);
        const res = await searchOutbound(req);
        if (res?.offers) setOutboundFilters(buildInitialFilters(res.offers));
        setStep("results");
    };

    /** User picked an outbound flight from the list. */
    const handleSelectOutbound = async (offer: FlightOffer) => {
        nativeBridge.haptic("light");
        if (!isRoundTrip || !lastRequest) {
            // One-way → straight to passenger details
            setSelected(offer);
            setBookError(null);
            setStep("passenger");
            return;
        }
        // Round-trip → store outbound, fetch return options
        setOutboundOffer(offer);
        setIsSearchingReturn(true);
        setActiveLeg("return");
        try {
            const res = await mockFlightApi.search({
                origin: lastRequest.destination,
                destination: lastRequest.origin,
                departureDate: lastRequest.returnDate!,
                passengers: lastRequest.passengers,
                cabin: lastRequest.cabin,
            });
            setReturnOffers(res.offers);
            setReturnFilters(buildInitialFilters(res.offers));
        } catch {
            setReturnOffers([]);
            setReturnFilters(null);
        } finally {
            setIsSearchingReturn(false);
        }
    };

    /** User picked a return flight — combine and go to passenger details. */
    const handleSelectReturn = (returnOffer: FlightOffer) => {
        if (!outboundOffer) return;
        nativeBridge.haptic("light");
        const combined = combineOffers(outboundOffer, returnOffer);
        setSelected(combined);
        setBookError(null);
        setStep("passenger");
    };

    /** Step back from return list to outbound list (re-pick outbound). */
    const backToOutbound = () => {
        setActiveLeg("outbound");
        setOutboundOffer(null);
        setReturnOffers(null);
    };

    const goConfirm = async (input: {
        passengerName: string;
        paymentMethodToken?: string;
    }) => {
        if (!selected) return;
        setBookError(null);
        try {
            const isRT = selected.slices.length > 1;
            const firstSlice = selected.slices[0];
            const lastSlice = selected.slices[selected.slices.length - 1];
            const route = isRT
                ? `${firstSlice.origin.iata} ⇄ ${firstSlice.destination.iata}`
                : `${firstSlice.origin.iata} → ${firstSlice.destination.iata}`;
            const flightNumber = firstSlice.segments[0].flightNumber;
            await book(
                {
                    offerId: selected.id,
                    passengerName: input.passengerName,
                    paymentMethodToken: input.paymentMethodToken,
                },
                {
                    offerTotal: selected.price.total,
                    currency: selected.price.currency,
                    currentBalance: totalBalance,
                    route,
                    flightNumber,
                    departureUtc: firstSlice.departureUtc,
                }
            );
            // Persist the spend so the wallet balance and ledger update.
            const description = isRT
                ? `טיסה הלוך וחזור (${firstSlice.origin.iata}⇄${firstSlice.destination.iata}) · ${flightNumber} + ${lastSlice.segments[0].flightNumber}`
                : `טיסה ${flightNumber} (${firstSlice.origin.iata}→${firstSlice.destination.iata})`;
            recordSpend({
                amount: selected.price.total,
                currency: selected.price.currency || user.currency,
                description,
                reference: `booking:flight-${selected.id}`,
            });
            setStep("issued");
        } catch (e) {
            nativeBridge.haptic("error");
            setBookError(e instanceof Error ? e.message : t.common.bookingFailed);
        }
    };

    const reset_all = () => {
        reset();
        setSelected(null);
        setBookError(null);
        setOutboundOffer(null);
        setReturnOffers(null);
        setActiveLeg("outbound");
        setStep("search");
    };

    // Decide which list to render in the results step
    const showingReturnList = isRoundTrip && activeLeg === "return";
    const visibleOffers = showingReturnList
        ? returnOffers ?? []
        : outboundData?.offers ?? [];
    const isLoadingList = showingReturnList
        ? isSearchingReturn
        : isSearchingOutbound;
    const onSelectFromList = showingReturnList
        ? handleSelectReturn
        : handleSelectOutbound;

    // Active filter state for the visible leg
    const activeFilterState = showingReturnList
        ? returnFilters
        : outboundFilters;
    const setActiveFilterState = (next: FlightFilterState) => {
        if (showingReturnList) setReturnFilters(next);
        else setOutboundFilters(next);
    };

    // Apply filters to the visible offer list
    const filteredOffers = useMemo(() => {
        if (!activeFilterState) return visibleOffers;
        return applyFlightFilters(visibleOffers, activeFilterState);
    }, [visibleOffers, activeFilterState]);

    // Header route reflects the leg being chosen
    const headerOrigin = showingReturnList
        ? lastRequest?.destination
        : lastRequest?.origin;
    const headerDestination = showingReturnList
        ? lastRequest?.origin
        : lastRequest?.destination;
    const headerDate = showingReturnList
        ? lastRequest?.returnDate
        : lastRequest?.departureDate;

    return (
        <div className="space-y-5 py-6">
            <AnimatePresence mode="wait">
                {step === "search" && (
                    <motion.div
                        key="search"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                    >
                        <FlightSearchForm onSearch={goSearch} isLoading={isSearchingOutbound} />
                    </motion.div>
                )}

                {step === "results" && lastRequest && (
                    <motion.div
                        key="results"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="space-y-4"
                        dir="rtl"
                    >
                        {/* Round-trip step indicator */}
                        {isRoundTrip && (
                            <RoundTripSteps
                                activeLeg={activeLeg}
                                outboundOffer={outboundOffer}
                                onChangeOutbound={backToOutbound}
                            />
                        )}

                        <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-[10px] uppercase tracking-[0.25em] text-cyan-jet">
                                    {t.common.results}
                                </p>
                                <h2 className="font-display text-xl font-semibold truncate">
                                    {headerOrigin} → {headerDestination}
                                </h2>
                                <p className="text-xs text-text-secondary">
                                    {headerDate &&
                                        new Date(headerDate).toLocaleDateString("he-IL", {
                                            weekday: "short",
                                            month: "short",
                                            day: "numeric",
                                        })}{" "}
                                    · {t.common.passengersShort(lastRequest.passengers)} ·{" "}
                                    {t.flights.cabinOptions[lastRequest.cabin] ?? lastRequest.cabin}
                                </p>
                            </div>
                            <GhostButton
                                type="button"
                                onClick={
                                    showingReturnList ? backToOutbound : () => setStep("search")
                                }
                            >
                                <ArrowLeft className="h-4 w-4" /> {t.common.edit}
                            </GhostButton>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                            {visibleOffers.length > 0 && activeFilterState && (
                                <FlightFilters
                                    sourceOffers={visibleOffers}
                                    state={activeFilterState}
                                    onChange={setActiveFilterState}
                                />
                            )}
                            <div className="min-w-0 space-y-3">
                                {filteredOffers.length === 0 &&
                                    visibleOffers.length > 0 &&
                                    !isLoadingList && (
                                        <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-6 text-center text-sm text-text-secondary">
                                            {t.flights.filters.noMatches}
                                        </div>
                                    )}
                                <FlightResultsList
                                    offers={filteredOffers}
                                    isLoading={isLoadingList}
                                    onSelect={onSelectFromList}
                                />
                            </div>
                        </div>
                    </motion.div>
                )}

                {step === "passenger" && selected && lastRequest && (
                    <motion.div
                        key="passenger"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                    >
                        <PassengerDetailsStep
                            initial={passenger ?? undefined}
                            departureDate={
                                selected.slices[0].departureUtc.slice(0, 10)
                            }
                            onSubmit={(d) => {
                                setPassenger(d);
                                setStep("checkout");
                            }}
                            onBack={() => {
                                setStep("results");
                            }}
                        />
                    </motion.div>
                )}

                {step === "checkout" && selected && passenger && (
                    <motion.div
                        key="checkout"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="space-y-3"
                    >
                        {bookError && (
                            <div className="mx-auto max-w-2xl rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
                                {bookError}
                            </div>
                        )}
                        <CheckoutSummary
                            offer={selected}
                            currentBalance={totalBalance}
                            isLoading={isBooking}
                            passenger={passenger}
                            onConfirm={goConfirm}
                            onEditPassenger={() => setStep("passenger")}
                            onBack={() => {
                                // Back from checkout returns to the passenger details
                                setStep("passenger");
                            }}
                        />
                    </motion.div>
                )}

                {step === "issued" && result && (
                    <motion.div
                        key="issued"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                    >
                        <TicketIssued result={result} onSearchAgain={reset_all} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/**
 * Two-pill progress indicator shown above the round-trip results list.
 * Pill 1 = "Step 1: select outbound" (turns green/check once chosen).
 * Pill 2 = "Step 2: select return" (active blue while picking return).
 */
function RoundTripSteps({
    activeLeg,
    outboundOffer,
    onChangeOutbound,
}: {
    activeLeg: Leg;
    outboundOffer: FlightOffer | null;
    onChangeOutbound: () => void;
}) {
    const outboundDone = !!outboundOffer;
    const outboundActive = activeLeg === "outbound";
    const returnActive = activeLeg === "return";

    return (
        <div className="flex flex-wrap items-center gap-2 text-xs" dir="rtl">
            {/* Step 1 */}
            <span
                className={
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium transition-colors " +
                    (outboundActive
                        ? "border-cyan-deep/40 bg-cyan-deep/10 text-cyan-deep dark:border-cyan-jet/40 dark:bg-cyan-jet/10 dark:text-cyan-glow"
                        : outboundDone
                            ? "border-success/40 bg-success/10 text-success"
                            : "border-white/10 bg-white/[0.04] text-text-secondary")
                }
            >
                {outboundDone && !outboundActive ? (
                    <Check className="h-3.5 w-3.5" />
                ) : (
                    <Plane className="h-3.5 w-3.5" />
                )}
                {t.flights.step1Outbound}
            </span>

            {/* Step 2 */}
            <span
                className={
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium transition-colors " +
                    (returnActive
                        ? "border-cyan-deep/40 bg-cyan-deep/10 text-cyan-deep dark:border-cyan-jet/40 dark:bg-cyan-jet/10 dark:text-cyan-glow"
                        : "border-white/10 bg-white/[0.04] text-text-secondary")
                }
            >
                <Plane className="h-3.5 w-3.5 -scale-x-100" />
                {t.flights.step2Return}
            </span>

            {/* Outbound summary pill — appears once chosen, lets user re-pick */}
            {outboundOffer && (
                <button
                    type="button"
                    onClick={onChangeOutbound}
                    className="ms-auto inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-text-secondary hover:text-text-primary"
                >
                    <span className="truncate max-w-[180px]">
                        {t.flights.outboundSelectedShort(
                            `${outboundOffer.slices[0].origin.iata}→${outboundOffer.slices[0].destination.iata}`,
                            formatTimeLabel(outboundOffer.slices[0].departureUtc)
                        )}
                    </span>
                    <span className="opacity-70">· {t.flights.changeOutbound}</span>
                </button>
            )}
        </div>
    );
}
