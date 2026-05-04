import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useRedeemGift } from "@/hooks/useRedeemGift";
import {
    resetAppStore,
    selectCardById,
    selectWalletBalance,
} from "@/lib/appStore";
import { MOCK_GIFT_CARDS } from "@/lib/mockData";

// Avoid hitting axios — mock the API utility used by the hook.
vi.mock("@/utils/ApiUtils", () => ({
    ApiUtils: {
        post: () => ({
            startRequest: () => Promise.resolve({ success: true }),
        }),
    },
}));

describe("useRedeemGift", () => {
    beforeEach(() => resetAppStore());

    it("redeems a non-numeric mock card and updates the store", async () => {
        const id = MOCK_GIFT_CARDS[0].id; // e.g. "gc_001"
        const amount = MOCK_GIFT_CARDS[0].amount;
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
