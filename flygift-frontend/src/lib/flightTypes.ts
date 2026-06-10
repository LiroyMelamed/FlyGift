/**
 * Shape mirrors the backend Services/Flights/FlightModels.cs. Provider-
 * neutral: backend maps Kiwi Tequila / mock results into this shape.
 */

export type CabinClass = "Economy" | "PremiumEconomy" | "Business" | "First";

export interface FlightSearchRequest {
    origin: string;
    destination: string;
    departureDate: string; // ISO yyyy-mm-dd
    returnDate?: string;
    passengers: number;
    cabin: CabinClass;
}

export interface Airport {
    iata: string;
    name: string;
    city: string;
    country: string;
}

export interface CarrierInfo {
    iata: string;
    name: string;
    logoUrl: string;
}

export interface Place {
    iata: string;
    name: string;
    city: string;
    country: string;
    terminal?: string | null;
}

export interface FlightSegment {
    flightNumber: string;
    marketingCarrier: CarrierInfo;
    origin: Place;
    destination: Place;
    departureUtc: string;
    arrivalUtc: string;
    aircraft: string;
}

export interface FlightSlice {
    origin: Place;
    destination: Place;
    departureUtc: string;
    arrivalUtc: string;
    durationMinutes: number;
    segments: FlightSegment[];
}

export interface PriceDetails {
    total: number;
    base: number;
    taxes: number;
    currency: string;
    marketMedian: number;
}

export interface FlightOffer {
    id: string;
    source: string;
    carrier: CarrierInfo;
    slices: FlightSlice[];
    price: PriceDetails;
    totalDurationMinutes: number;
    stops: number;
    isBestPrice: boolean;
    bestPriceReason?: string | null;
    expiresAt: string;
}

export interface FlightSearchResponse {
    searchId: string;
    generatedAt: string;
    offers: FlightOffer[];
}

export interface PassengerInfo {
    firstName: string;
    lastName: string;
    passportNumber?: string;
    passportExpiry?: string; // yyyy-mm-dd
    birthDate?: string;      // yyyy-mm-dd
}

export interface BookFlightRequest {
    offerId: string;
    /** Multi-passenger manifest (preferred). One entry per pax. */
    passengers?: PassengerInfo[];
    /** Legacy single-name field, kept for clients that haven't migrated. */
    passengerName?: string;
    paymentMethodToken?: string;
    /** Set after a 409 price_changed to confirm the re-checked total. */
    acceptedPrice?: number;
}

export interface BookFlightResult {
    bookingId: number;
    flightNumber: string;
    route: string;
    departureUtc: string;
    seat: string;
    gate: string;
    totalCharged: number;
    paidFromBalance: number;
    paidFromCard: number;
    currency: string;
    remainingBalance: number;
    cardBrand?: string | null;
    cardLast4?: string | null;
}
