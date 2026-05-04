import type { Transaction } from "./transactionTypes";

const now = Date.now();
const daysAgo = (n: number) => new Date(now - n * 86_400_000).toISOString();

export const MOCK_TRANSACTIONS: Transaction[] = [
    {
        id: 1024,
        userId: 1,
        type: "Load",
        amount: 250,
        currency: "ILS",
        relatedGiftCardId: 4,
        transactionReference: "giftcard:4",
        balanceAfter: 1240,
        isReversal: false,
        description: "מימוש כרטיס מתנה #4 מאת Acme Corp",
        createdAt: daysAgo(1),
    },
    {
        id: 1023,
        userId: 1,
        type: "Spend",
        amount: 489.4,
        currency: "ILS",
        transactionReference: "booking:218",
        balanceAfter: 990,
        isReversal: false,
        description: "טיסה AF221 (TLV→CDG) — ארנק",
        createdAt: daysAgo(3),
    },
    {
        id: 1022,
        userId: 1,
        type: "Spend",
        amount: 120,
        currency: "ILS",
        transactionReference: "booking:217",
        balanceAfter: 1479.4,
        isReversal: false,
        description: "טיסה EK932 (TLV→DXB) — כרטיס אשראי VISA •••4242",
        createdAt: daysAgo(7),
    },
    {
        id: 1021,
        userId: 1,
        type: "Load",
        amount: 500,
        currency: "ILS",
        relatedGiftCardId: 3,
        transactionReference: "giftcard:3",
        balanceAfter: 1599.4,
        isReversal: false,
        description: "מימוש כרטיס מתנה #3 מאת Tech Inc.",
        createdAt: daysAgo(14),
    },
    {
        id: 1020,
        userId: 1,
        type: "Refund",
        amount: 89.99,
        currency: "ILS",
        transactionReference: "booking:215",
        balanceAfter: 1099.4,
        isReversal: false,
        description: "זיכוי — טיסת BA168 בוטלה",
        createdAt: daysAgo(21),
    },
];

export function searchTransactions(items: Transaction[], q: string): Transaction[] {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((t) =>
        [
            String(t.id),
            t.transactionReference ?? "",
            t.description ?? "",
            t.type,
            t.currency,
        ]
            .join(" ")
            .toLowerCase()
            .includes(term)
    );
}
