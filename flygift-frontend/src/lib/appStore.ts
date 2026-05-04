"use client";

/**
 * Single source of truth for the demo app's user wallet, gift cards,
 * and transaction history. All views read from here so the dashboard,
 * gift detail page, transactions ledger, and redeem flow stay in sync.
 *
 * Implemented as a tiny module-level pub/sub + `useSyncExternalStore`
 * hook — no external deps. Replace the `redeemCard` action's local
 * mutation with an API call once the backend is wired.
 */

import { useSyncExternalStore } from "react";
import {
    MOCK_GIFT_CARDS,
    type MockGiftCard,
} from "@/lib/mockData";
import type { Transaction, TransactionType } from "@/lib/transactionTypes";
import { TX_SIGN } from "@/lib/transactionTypes";

export interface AppUser {
    firstName: string;
    currency: string;
}

export interface AppState {
    user: AppUser;
    cards: MockGiftCard[];
    transactions: Transaction[];
}

const INITIAL_USER: AppUser = {
    firstName: "Liroy",
    currency: "ILS",
};

/**
 * Build an initial transaction ledger from the mock gift cards plus a
 * couple of demo spends, so KPIs add up cleanly. Card "Active" entries
 * are *not* yet credited to the wallet — they're credited only when the
 * user redeems them through the app.
 */
function buildInitialState(): AppState {
    const currency = INITIAL_USER.currency;
    const now = Date.now();
    const daysAgo = (n: number) =>
        new Date(now - n * 86_400_000).toISOString();

    // Seed a few historical transactions (already happened before today's
    // active gift cards). Balance after each = running total.
    const seed: Array<Omit<Transaction, "balanceAfter">> = [
        {
            id: 1001,
            userId: 1,
            type: "Load",
            amount: 800,
            currency,
            relatedGiftCardId: null,
            transactionReference: "giftcard:seed-1",
            isReversal: false,
            description: "מימוש כרטיס מתנה ראשוני",
            createdAt: daysAgo(28),
        },
        {
            id: 1002,
            userId: 1,
            type: "Spend",
            amount: 380,
            currency,
            transactionReference: "booking:flight-AF221",
            isReversal: false,
            description: "טיסה AF221 (TLV→CDG)",
            createdAt: daysAgo(20),
        },
        {
            id: 1003,
            userId: 1,
            type: "Refund",
            amount: 90,
            currency,
            transactionReference: "booking:BA168",
            isReversal: false,
            description: "זיכוי — טיסת BA168 בוטלה",
            createdAt: daysAgo(14),
        },
    ];

    let running = 0;
    const transactions: Transaction[] = seed.map((tx) => {
        const sign = tx.isReversal ? -TX_SIGN[tx.type] : TX_SIGN[tx.type];
        running += sign * tx.amount;
        return { ...tx, balanceAfter: running };
    });

    return {
        user: INITIAL_USER,
        cards: MOCK_GIFT_CARDS.map((c) => ({ ...c })),
        transactions,
    };
}

let state: AppState = buildInitialState();
const listeners = new Set<() => void>();

function emit() {
    for (const l of listeners) l();
}

function subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
}

function getSnapshot(): AppState {
    return state;
}

/* ------------------------------------------------------------------ */
/* Selectors                                                           */
/* ------------------------------------------------------------------ */

/** Wallet balance = net of the transaction ledger. */
export function selectWalletBalance(s: AppState = state): number {
    let net = 0;
    for (const tx of s.transactions) {
        const sign = tx.isReversal ? -TX_SIGN[tx.type] : TX_SIGN[tx.type];
        net += sign * tx.amount;
    }
    return net;
}

/** Active (un-redeemed, non-expired) gift cards still held. */
export function selectActiveCards(s: AppState = state): MockGiftCard[] {
    return s.cards.filter((c) => c.status === "Active");
}

/** Total balance shown on the dashboard = wallet + value of held cards. */
export function selectTotalBalance(s: AppState = state): number {
    const inCards = selectActiveCards(s).reduce((sum, c) => sum + c.amount, 0);
    return selectWalletBalance(s) + inCards;
}

export function selectCardById(id: string, s: AppState = state) {
    return s.cards.find((c) => c.id === id);
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

function nextTxId(): number {
    return state.transactions.reduce((m, t) => Math.max(m, t.id), 1000) + 1;
}

/**
 * Mark a card as Redeemed and credit its amount to the wallet ledger.
 * Idempotent: redeeming a non-Active card is a no-op.
 */
export function redeemCard(cardId: string): {
    ok: boolean;
    reason?: string;
    redeemedAt?: string;
} {
    const card = state.cards.find((c) => c.id === cardId);
    if (!card) return { ok: false, reason: "כרטיס המתנה לא נמצא." };
    if (card.status === "Redeemed")
        return { ok: false, reason: "מתנה זו כבר מומשה." };
    if (card.status === "Expired")
        return { ok: false, reason: "תוקף המתנה פג." };

    const redeemedAt = new Date().toISOString();
    const cards = state.cards.map((c) =>
        c.id === cardId ? { ...c, status: "Redeemed" as const } : c
    );

    const wallet = selectWalletBalance({ ...state, cards });
    const newTx: Transaction = {
        id: nextTxId(),
        userId: 1,
        type: "Load",
        amount: card.amount,
        currency: card.currency,
        relatedGiftCardId: null,
        transactionReference: `giftcard:${card.id}`,
        balanceAfter: wallet + card.amount,
        isReversal: false,
        description: `מימוש כרטיס מתנה מאת ${card.senderName}`,
        createdAt: redeemedAt,
    };

    state = {
        ...state,
        cards,
        transactions: [newTx, ...state.transactions],
    };
    emit();
    return { ok: true, redeemedAt };
}

/** Generic Spend action — use for hotel/flight bookings. */
export function recordSpend(input: {
    amount: number;
    currency?: string;
    description: string;
    reference?: string;
}): Transaction {
    const currency = input.currency ?? state.user.currency;
    const wallet = selectWalletBalance();
    const tx: Transaction = {
        id: nextTxId(),
        userId: 1,
        type: "Spend",
        amount: input.amount,
        currency,
        transactionReference: input.reference,
        balanceAfter: wallet - input.amount,
        isReversal: false,
        description: input.description,
        createdAt: new Date().toISOString(),
    };
    state = { ...state, transactions: [tx, ...state.transactions] };
    emit();
    return tx;
}

/** Reset the store back to seed state — handy for tests / dev. */
export function resetAppStore(): void {
    state = buildInitialState();
    emit();
}

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

/** Subscribe to the full app state. Components re-render on any change. */
export function useAppStore<T = AppState>(
    selector: (s: AppState) => T = (s) => s as unknown as T
): T {
    return useSyncExternalStore(
        subscribe,
        () => selector(getSnapshot()),
        () => selector(getSnapshot())
    );
}

/** Convenience: a stable bag of common derived values. */
export interface AppDerived {
    user: AppUser;
    cards: MockGiftCard[];
    activeCards: MockGiftCard[];
    transactions: Transaction[];
    walletBalance: number;
    totalBalance: number;
    activeGiftCount: number;
}

export function useAppDerived(): AppDerived {
    const s = useAppStore();
    const activeCards = selectActiveCards(s);
    return {
        user: s.user,
        cards: s.cards,
        activeCards,
        transactions: s.transactions,
        walletBalance: selectWalletBalance(s),
        totalBalance: selectTotalBalance(s),
        activeGiftCount: activeCards.length,
    };
}

/** Re-export the type used by transaction-related views. */
export type { TransactionType };
