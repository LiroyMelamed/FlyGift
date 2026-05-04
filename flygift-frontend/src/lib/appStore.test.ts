import { describe, it, expect, beforeEach } from "vitest";
import {
    redeemCard,
    recordSpend,
    resetAppStore,
    selectActiveCards,
    selectTotalBalance,
    selectWalletBalance,
    selectCardById,
} from "@/lib/appStore";
import { MOCK_GIFT_CARDS } from "@/lib/mockData";

describe("appStore", () => {
    beforeEach(() => resetAppStore());

    it("seeds with all mock cards Active", () => {
        const active = selectActiveCards();
        expect(active).toHaveLength(MOCK_GIFT_CARDS.length);
    });

    it("totalBalance = wallet + sum of active cards", () => {
        const cardsTotal = MOCK_GIFT_CARDS.reduce((s, c) => s + c.amount, 0);
        const total = selectTotalBalance();
        const wallet = selectWalletBalance();
        expect(total).toBeCloseTo(wallet + cardsTotal, 2);
    });

    it("redeemCard moves the value from card to wallet", () => {
        const before = selectTotalBalance();
        const targetId = MOCK_GIFT_CARDS[0].id;
        const cardAmount = MOCK_GIFT_CARDS[0].amount;
        const walletBefore = selectWalletBalance();

        const res = redeemCard(targetId);
        expect(res.ok).toBe(true);

        // Card flipped
        expect(selectCardById(targetId)?.status).toBe("Redeemed");
        // Active count down by one
        expect(selectActiveCards()).toHaveLength(MOCK_GIFT_CARDS.length - 1);
        // Wallet credited by exactly the card's amount
        expect(selectWalletBalance()).toBeCloseTo(walletBefore + cardAmount, 2);
        // Total balance is preserved (card → wallet, no value created)
        expect(selectTotalBalance()).toBeCloseTo(before, 2);
    });

    it("redeemCard is idempotent for non-active cards", () => {
        const id = MOCK_GIFT_CARDS[0].id;
        const first = redeemCard(id);
        const second = redeemCard(id);
        expect(first.ok).toBe(true);
        expect(second.ok).toBe(false);
    });

    it("redeemCard rejects unknown ids", () => {
        const res = redeemCard("does-not-exist");
        expect(res.ok).toBe(false);
    });

    it("recordSpend debits the wallet and appends a Spend transaction", () => {
        const walletBefore = selectWalletBalance();
        const tx = recordSpend({
            amount: 100,
            description: "Test booking",
            reference: "test:1",
        });
        expect(tx.type).toBe("Spend");
        expect(selectWalletBalance()).toBeCloseTo(walletBefore - 100, 2);
        expect(tx.balanceAfter).toBeCloseTo(walletBefore - 100, 2);
    });

    it("dashboard balance == ledger total when seeded", () => {
        // The two KPIs that drift in production must agree.
        const dashboard = selectTotalBalance();
        const wallet = selectWalletBalance();
        const cardsHeld = selectActiveCards().reduce((s, c) => s + c.amount, 0);
        expect(dashboard).toBeCloseTo(wallet + cardsHeld, 2);
    });
});
