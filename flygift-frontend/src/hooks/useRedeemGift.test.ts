import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useRedeemGift } from "@/hooks/useRedeemGift";
import {
    resetAppStore,
    setCards,
    selectCardById,
    selectWalletBalance,
} from "@/lib/appStore";
import type { MockGiftCard } from "@/lib/mockData";

// Cards now live in the backend; the hook calls `POST /api/GiftCard/Redeem`
// for numeric IDs, then mutates the in-memory store as source of truth.
// Mock the network so the test stays unit-scoped.
vi.mock("@/utils/ApiUtils", () => ({
    ApiUtils: {
        post: () => ({
            startRequest: () => Promise.resolve({ success: true }),
        }),
        get: () => ({
            startRequest: () => Promise.resolve({ success: true, items: [] }),
        }),
    },
}));

const FIXTURE_CARD: MockGiftCard = {
    id: "42",
    code: "FG-TEST-LIVE",
    amount: 320,
    currency: "ILS",
    status: "Active",
    variant: "cyan-jet",
    category: "Flights",
    senderName: "Test Sender",
    recipientName: "Test Recipient",
    expirationDate: "2027-12-31T00:00:00Z",
    createdAt: "2026-01-01T00:00:00Z",
};

describe("useRedeemGift", () => {
    beforeEach(() => {
        resetAppStore();
        setCards([{ ...FIXTURE_CARD }]);
    });

    it("redeems a fixture card and updates the store", async () => {
        const id = FIXTURE_CARD.id;
        const amount = FIXTURE_CARD.amount;
        const walletBefore = selectWalletBalance();

        const { result } = renderHook(() => useRedeemGift());

        await act(async () => {
            const res = await result.current.redeem(id);
            expect(res.success).toBe(true);
        });

        await waitFor(() => {
            expect(selectCardById(id)?.status).toBe("Redeemed");
        });
        expect(selectWalletBalance()).toBeCloseTo(walletBefore + amount, 2);
    });

    it("returns success=false when redeeming an unknown id", async () => {
        const { result } = renderHook(() => useRedeemGift());
        await act(async () => {
            const res = await result.current.redeem("nope");
            expect(res.success).toBe(false);
        });
    });
});
