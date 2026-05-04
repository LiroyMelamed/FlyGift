import type { Trip, TripsResponse } from "./tripTypes";

const DAY = 24 * 60 * 60 * 1000;

export const MOCK_TRIPS: TripsResponse = {
    wallet: { activeGiftCount: 3, totalActiveBalance: 1240, currency: "USD" },
    upcoming: [
        {
            bookingId: 10241,
            status: "Booked",
            flightNumber: "AF221",
            carrier: "Air France",
            origin: "TLV", originCity: "Tel Aviv",
            destination: "CDG", destinationCity: "Paris",
            departureUtc: new Date(Date.now() + 9 * DAY).toISOString(),
            arrivalUtc: new Date(Date.now() + 9 * DAY + 5 * 3600 * 1000).toISOString(),
            gate: "B12", seat: "14A", terminal: "3",
            bookingReference: "FG-AB12CD",
            totalCharged: 482, stops: 0,
            flightStatus: "On Time",
            isUpcoming: true,
            createdAt: new Date(Date.now() - 4 * DAY).toISOString(),
        },
        {
            bookingId: 10242,
            status: "Booked",
            flightNumber: "EK932",
            carrier: "Emirates",
            origin: "TLV", originCity: "Tel Aviv",
            destination: "DXB", destinationCity: "Dubai",
            departureUtc: new Date(Date.now() + 21 * DAY).toISOString(),
            arrivalUtc: new Date(Date.now() + 21 * DAY + 3.5 * 3600 * 1000).toISOString(),
            gate: "C04", seat: "8F", terminal: "1",
            bookingReference: "FG-EX42YZ",
            totalCharged: 615, stops: 0,
            flightStatus: "Delayed",
            isUpcoming: true,
            createdAt: new Date(Date.now() - 1 * DAY).toISOString(),
        },
    ],
    past: [
        {
            bookingId: 10110,
            status: "Booked",
            flightNumber: "BA168",
            carrier: "British Airways",
            origin: "TLV", originCity: "Tel Aviv",
            destination: "LHR", destinationCity: "London",
            departureUtc: new Date(Date.now() - 32 * DAY).toISOString(),
            arrivalUtc: new Date(Date.now() - 32 * DAY + 5.2 * 3600 * 1000).toISOString(),
            gate: "A18", seat: "22C", terminal: "5",
            bookingReference: "FG-LDN891",
            totalCharged: 398, stops: 0,
            flightStatus: "Arrived",
            isUpcoming: false,
            createdAt: new Date(Date.now() - 60 * DAY).toISOString(),
        },
        {
            bookingId: 9988,
            status: "Booked",
            flightNumber: "DL412",
            carrier: "Delta",
            origin: "JFK", originCity: "New York",
            destination: "LAX", destinationCity: "Los Angeles",
            departureUtc: new Date(Date.now() - 90 * DAY).toISOString(),
            arrivalUtc: new Date(Date.now() - 90 * DAY + 6 * 3600 * 1000).toISOString(),
            gate: "D22", seat: "11A", terminal: "4",
            bookingReference: "FG-USA771",
            totalCharged: 312, stops: 0,
            flightStatus: "Arrived",
            isUpcoming: false,
            createdAt: new Date(Date.now() - 120 * DAY).toISOString(),
        },
    ],
};

export function searchTrips(all: Trip[], q: string): Trip[] {
    const term = q.trim().toLowerCase();
    if (!term) return all;
    return all.filter(
        (t) =>
            String(t.bookingId).includes(term) ||
            t.bookingReference?.toLowerCase().includes(term) ||
            t.destination.toLowerCase().includes(term) ||
            t.destinationCity.toLowerCase().includes(term) ||
            t.origin.toLowerCase().includes(term) ||
            t.originCity.toLowerCase().includes(term) ||
            t.flightNumber.toLowerCase().includes(term)
    );
}
