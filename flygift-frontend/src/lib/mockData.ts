/**
 * Mock data for Stage 5 — replace with real API calls in a later stage.
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

export const MOCK_USER = {
    firstName: "Liroy",
    totalBalance: 1240.0,
    currency: "ILS",
    activeGiftCount: 3,
};

export const MOCK_GIFT_CARDS: MockGiftCard[] = [
    {
        id: "gc_001",
        code: "FG-7K2X-9HQ4",
        amount: 500,
        currency: "ILS",
        status: "Active",
        variant: "cyan-jet",
        category: "Flights",
        senderName: "שרה כהן",
        recipientName: "לירוי מלמד",
        expirationDate: "2026-12-31T00:00:00Z",
        createdAt: "2026-04-12T10:24:00Z",
        message: "תיהנה מהטיול המדהים!",
    },
    {
        id: "gc_002",
        code: "FG-LX88-MARZ",
        amount: 750,
        currency: "ILS",
        status: "Active",
        variant: "gold-champagne",
        category: "Hotels",
        senderName: "FlyGift Rewards",
        recipientName: "לירוי מלמד",
        expirationDate: "2027-02-14T00:00:00Z",
        createdAt: "2026-03-01T18:05:00Z",
        message: "תיהנו מלינה יוקרתית על חשבוננו.",
    },
    {
        id: "gc_003",
        code: "FG-NB12-QRT8",
        amount: 250,
        currency: "ILS",
        status: "Active",
        variant: "violet-aurora",
        category: "Travel",
        senderName: "דוד לוי",
        recipientName: "לירוי מלמד",
        expirationDate: "2026-09-30T00:00:00Z",
        createdAt: "2026-02-22T08:15:00Z",
    },
];

export const MOCK_TRANSACTIONS: MockTransaction[] = [
    {
        id: "tx_001",
        title: "מתנה התקבלה משרה",
        subtitle: "כרטיס מתנה לטיסה",
        amount: 500,
        currency: "ILS",
        status: "Active",
        date: "2026-04-12T10:24:00Z",
        icon: "gift",
    },
    {
        id: "tx_002",
        title: "טיסה נהזמנה לפאריס",
        subtitle: "איר פרנס · CDG",
        amount: -380,
        currency: "ILS",
        status: "Redeemed",
        date: "2026-04-08T13:51:00Z",
        icon: "plane",
    },
    {
        id: "tx_003",
        title: "הזמנת מלון",
        subtitle: "Le Meurice · 3 לילות",
        amount: -620,
        currency: "ILS",
        status: "Redeemed",
        date: "2026-04-08T13:55:00Z",
        icon: "hotel",
    },
    {
        id: "tx_004",
        title: "מתנה נשלחה לדניאל",
        subtitle: "הפתעת יום הולדת",
        amount: -200,
        currency: "ILS",
        status: "Active",
        date: "2026-03-25T09:10:00Z",
        icon: "card",
    },
    {
        id: "tx_005",
        title: "בונוס מבצע",
        subtitle: "FlyGift Rewards",
        amount: 50,
        currency: "ILS",
        status: "Redeemed",
        date: "2026-03-12T16:00:00Z",
        icon: "gift",
    },
];

/** Extra demo cards so /gifts/[id] can demo Redeemed and Expired states. */
const DEMO_STATE_CARDS: MockGiftCard[] = [
    {
        id: "gc_redeemed",
        code: "FG-USED-0000",
        amount: 300,
        currency: "ILS",
        status: "Redeemed",
        variant: "gold-champagne",
        category: "Hotels",
        senderName: "אמא",
        recipientName: "לירוי מלמד",
        expirationDate: "2027-01-01T00:00:00Z",
        createdAt: "2026-01-15T08:00:00Z",
        message: "תפנקו את עצמכם בסוף שבוע משובח.",
    },
    {
        id: "gc_expired",
        code: "FG-EXPD-0000",
        amount: 120,
        currency: "ILS",
        status: "Expired",
        variant: "violet-aurora",
        category: "Travel",
        senderName: "Old Friend",
        recipientName: "Liroy Melamed",
        expirationDate: "2025-12-01T00:00:00Z",
        createdAt: "2024-11-20T08:00:00Z",
        message: "Hope you get to use it!",
    },
];

/** Look up a gift card by id (mock). */
export function getMockGiftCardById(id: string): MockGiftCard | undefined {
    return [...MOCK_GIFT_CARDS, ...DEMO_STATE_CARDS].find((c) => c.id === id);
}
