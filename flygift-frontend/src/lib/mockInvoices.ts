import type { BillingResponse } from "./billingTypes";

const now = Date.now();
const daysAgo = (n: number) => new Date(now - n * 86_400_000).toISOString();

export const MOCK_INVOICES: BillingResponse = {
    summary: {
        count: 4,
        totalInvoiced: 18_420,
        pending: 1,
        failed: 0,
    },
    invoices: [
        {
            id: 4,
            batchId: "9c3f1a72-4a01-4c2f-9b1d-4e9c5a2f0001",
            invoiceNumber: null,
            invoiceUrl: null,
            recipientCount: 24,
            totalCharged: 6000,
            currency: "USD",
            status: 0, // Pending
            createdAt: daysAgo(0),
            invoicedAt: null,
        },
        {
            id: 3,
            batchId: "8b2e1962-3a01-4c2f-9b1d-4e9c5a2f0002",
            invoiceNumber: "INV-2026-00084",
            invoiceUrl: "https://invoices.flygift.app/2026/INV-2026-00084.pdf",
            recipientCount: 50,
            totalCharged: 12_500,
            currency: "USD",
            status: 1,
            createdAt: daysAgo(7),
            invoicedAt: daysAgo(7),
        },
        {
            id: 2,
            batchId: "7a1d0f53-2a01-4c2f-9b1d-4e9c5a2f0003",
            invoiceNumber: "INV-2026-00072",
            invoiceUrl: "https://invoices.flygift.app/2026/INV-2026-00072.pdf",
            recipientCount: 18,
            totalCharged: 3_420,
            currency: "USD",
            status: 1,
            createdAt: daysAgo(21),
            invoicedAt: daysAgo(21),
        },
        {
            id: 1,
            batchId: "6900ee44-1a01-4c2f-9b1d-4e9c5a2f0004",
            invoiceNumber: "INV-2026-00041",
            invoiceUrl: "https://invoices.flygift.app/2026/INV-2026-00041.pdf",
            recipientCount: 10,
            totalCharged: 2_500,
            currency: "USD",
            status: 1,
            createdAt: daysAgo(45),
            invoicedAt: daysAgo(45),
        },
    ],
};
