import type { GiftCardVariant, MockGiftCard } from "@/lib/mockData";

export interface GiftDraft {
    recipientName: string;
    recipientEmail: string;
    message?: string;
    amount: number;
    currency: string;
    variant: GiftCardVariant;
    category: MockGiftCard["category"];
    expirationDate: string; // ISO
}

export const DEFAULT_DRAFT: GiftDraft = {
    recipientName: "",
    recipientEmail: "",
    message: "",
    amount: 250,
    currency: "USD",
    variant: "cyan-jet",
    category: "Flights",
    // Default 1-year expiration
    expirationDate: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000
    ).toISOString(),
};

export type StepKey = "recipient" | "amount" | "review" | "success";

export const STEP_LABELS: Record<Exclude<StepKey, "success">, string> = {
    recipient: "מקבל",
    amount: "סכום",
    review: "אישור",
};
