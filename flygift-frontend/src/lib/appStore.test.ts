import { describe, it, expect, beforeEach } from "vitest";
import {
    redeemCard,
    recordSpend,
    resetAppStore,
    setCards,
    selectActiveCards,
    selectTotalBalance,
    selectWalletBalance,
    selectCardById,
} from "@/lib/appStore";
import type { MockGiftCard } from "@/lib/mockData";

// Cards now live in the backend; tests install a deterministic fixture
// via `setCards` rather than rely on a deleted in-memory mock array.
const FIXTURE_CARDS: MockGiftCard[] = [
    {
        id: "1",
        code: "FG-TEST-0001",
        amount: 500,
        currency: "ILS",
        status: "Active",
        variant: "cyan-jet",
        category: "Flights",
        senderName: "Test Sender",
        recipientName: "Test Recipient",
        expirationDate: "2027-12-31T00:00:00Z",
        createdAt: "2026-01-01T00:00:00Z",
    },
    {
        id: "2",
        code: "FG-TEST-0002",
        amount: 250,
        currency: "ILS",
        status: "Active",
        variant: "gold-champagne",
        category: "Hotels",
        senderName: "Test Sender 2",
        recipientName: "Test Recipient",
        expirationDate: "2027-12-31T00:00:00Z",
        createdAt: "2026-01-02T00:00:00Z",
    },
];

describe("appStore", () => {
    beforeEach(() => {
        resetAppStore();
        setCards(FIXTURE_CARDS.map((c) => ({ ...c })));
    });

    it("seeds with all fixture cards Active", () => {
        const active = selectActiveCards();
        expect(active).toHaveLength(FIXTURE_CARDS.length);
    });

    it("totalBalance = wallet + sum of active cards", () => {
        const cardsTotal = FIXTURE_CARDS.reduce((s, c) => s + c.amount, 0);
        const total = selectTotalBalance();
        const wallet = selectWalletBalance();
        expect(total).toBeCloseTo(wallet + cardsTotal, 2);
    });

    it("redeemCard moves the value from card to wallet", () => {
        const before = selectTotalBalance();
        const targetId = FIXTURE_CARDS[0].id;
        const cardAmount = FIXTURE_CARDS[0].amount;
        const walletBefore = selectWalletBalance();

        const res = redeemCard(targetId);
        expect(res.ok).toBe(true);

        // Card flipped
        expect(selectCardById(targetId)?.status).toBe("Redeemed");
        // Active count down by one
        expect(selectActiveCards()).toHaveLength(FIXTURE_CARDS.length - 1);
        // Wallet credited by exactly the card's amount
        expect(selectWalletBalance()).toBeCloseTo(walletBefore + cardAmount, 2);
        // Total balance is preserved (card → wallet, no value created)
        expect(selectTotalBalance()).toBeCloseTo(before, 2);
    });

    it("redeemCard is idempotent for non-active cards", () => {
        const id = FIXTURE_CARDS[0].id;
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
        const dashboard = selectTotalBalance();
        const wallet = selectWalletBalance();
        const cardsHeld = selectActiveCards().reduce((s, c) => s + c.amount, 0);
        expect(dashboard).toBeCloseTo(wallet + cardsHeld, 2);
    });
});
