/**
 * Shared types + non-gift mock fixtures. Gift card data now lives in
 * the backend (`/api/GiftCard/*`); the gift mock arrays were removed
 * when `/gifts/[id]` and `useSendGift` were wired to the real API.
 */

export type GiftCardStatus = "Active" | "Redeemed" | "Expired";
export type GiftCardVariant = "cyan-jet" | "gold-champagne" | "violet-aurora";

export interface MockGiftCard {
    id: string;
    code: string;
    amount: number;
    currency: string;
    status: GiftCardStatus;
    variant: GiftCardVariant;
    category: "Flights" | "Hotels" | "Travel";
    senderName: string;
    recipientName: string;
    expirationDate: string; // ISO
    createdAt: string;      // ISO
    message?: string;
    /** Optional IATA codes for the gift's flight pairing — populated
     *  from FlightSnapshot when the sender chose a specific route.
     *  When absent, the LuxuryGiftCard falls back to defaults. */
    originIata?: string;
    destinationIata?: string;
}

export interface MockTransaction {
    id: string;
    title: string;
    subtitle: string;
    amount: number;          // negative = spend, positive = received
    currency: string;
    status: GiftCardStatus;
    date: string;            // ISO
    icon: "gift" | "plane" | "hotel" | "card";
}

