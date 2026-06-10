export type FlightStatus =
    | "On Time"
    | "Delayed"
    | "Boarding"
    | "Gate Change"
    | "Arrived"
    | "Cancelled"
    | "Unknown";

export interface Trip {
    bookingId: number;
    status: "Booked" | "Pending" | "Cancelled";
    flightNumber: string;
    carrier: string;
    origin: string;
    originCity: string;
    destination: string;
    destinationCity: string;
    departureUtc?: string;
    arrivalUtc?: string;
    gate?: string | null;
    seat?: string | null;
    terminal?: string | null;
    bookingReference?: string | null;
    totalCharged?: number | null;
    currency?: string | null;
    stops?: number | null;
    flightStatus: FlightStatus;
    isUpcoming: boolean;
    createdAt: string;
}

export interface TripsResponse {
    upcoming: Trip[];
    past: Trip[];
    wallet: {
        activeGiftCount: number;
        totalActiveBalance: number;
        currency: string;
    };
}
