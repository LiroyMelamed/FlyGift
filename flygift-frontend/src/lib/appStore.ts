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
import { type MockGiftCard } from "@/lib/mockData";
import type { Trip } from "@/lib/tripTypes";
import type { Transaction, TransactionType } from "@/lib/transactionTypes";
import { TX_SIGN } from "@/lib/transactionTypes";
import { readClaimsFromCookie, displayNameFromClaims, type UserRole } from "@/utils/jwt";

export interface AppUser {
    firstName: string;
    currency: string;
    /** Decoded from the JWT cookie. `null` until hydrated (or for guests). */
    role: UserRole | null;
}

export interface AppState {
    user: AppUser;
    cards: MockGiftCard[];
    bookings: Trip[];
    transactions: Transaction[];
}

const initialState: AppState = {
    user: { firstName: "", currency: "", role: null },
    cards: [],
    bookings: [],
    transactions: [],
};

let state: AppState = { ...initialState };
const listeners = new Set<() => void>();

/**
 * Reset only the user state (after logout or 401).
 */
export function resetUser(): void {
    state = { ...state, user: { firstName: "", currency: "", role: null } };
    emit();
}

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

/**
 * Credit the wallet after a successful API redeem when the card isn't
 * cached locally (e.g. opened via direct /gifts/FG-… link).
 */
export function applyRedeemFromApi(input: {
    cardId: string;
    amount: number;
    currency: string;
    senderName?: string;
}): { ok: true; redeemedAt: string } {
    const redeemedAt = new Date().toISOString();
    const hasCard = state.cards.some((c) => c.id === input.cardId);
    const cards = state.cards.map((c) =>
        c.id === input.cardId ? { ...c, status: "Redeemed" as const } : c
    );

    const walletBase = selectWalletBalance({
        ...state,
        cards: hasCard ? cards : state.cards,
    });

    const newTx: Transaction = {
        id: nextTxId(),
        userId: 1,
        type: "Load",
        amount: input.amount,
        currency: input.currency,
        relatedGiftCardId: Number(input.cardId) || null,
        transactionReference: `giftcard:${input.cardId}`,
        balanceAfter: walletBase + input.amount,
        isReversal: false,
        description: input.senderName
            ? `מימוש כרטיס מתנה מאת ${input.senderName}`
            : "מימוש כרטיס מתנה",
        createdAt: redeemedAt,
    };

    state = {
        ...state,
        cards: hasCard ? cards : state.cards,
        transactions: [newTx, ...state.transactions],
    };
    emit();
    return { ok: true, redeemedAt };
}

/** Wallet top-up — credit the ledger with a Load entry so the
 * dashboard balance and gift-send wizard see the new funds without
 * waiting for a full transaction refetch. */
export function recordTopUp(input: {
    amount: number;
    currency?: string;
    description?: string;
    reference?: string;
}): Transaction {
    const currency = input.currency ?? state.user.currency ?? "USD";
    const wallet = selectWalletBalance();
    const tx: Transaction = {
        id: nextTxId(),
        userId: 1,
        type: "Load",
        amount: input.amount,
        currency,
        transactionReference: input.reference,
        balanceAfter: wallet + input.amount,
        isReversal: false,
        description: input.description ?? "טעינת ארנק",
        createdAt: new Date().toISOString(),
    };
    state = { ...state, transactions: [tx, ...state.transactions] };
    emit();
    return tx;
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

/** Reset the store back to initial state. */
export function resetAppStore(): void {
    state = { ...initialState };
    emit();
}

/**
 * Replace the cards array wholesale. Used by `useHydrateGifts` after
 * `GET /api/GiftCard/Mine` resolves; tests can use it to install a
 * fixture deterministically.
 */
export function setCards(cards: MockGiftCard[]): void {
    state = { ...state, cards };
    emit();
}

/**
 * Replace the bookings array wholesale. Used by `useHydrateBookings`
 * after `GET /api/Bookings/Mine` resolves.
 */
export function setBookings(bookings: Trip[]): void {
    state = { ...state, bookings };
    emit();
}

/**
 * Replace the transactions ledger wholesale. Used by
 * `useHydrateTransactions` after `GET /api/Transaction/Mine` resolves
 * so the dashboard balance + transactions page reflect server state.
 */
export function setTransactions(transactions: Transaction[]): void {
    state = { ...state, transactions };
    emit();
}

/**
 * Backend sets `ClaimTypes.Name` to `user.FirstName ?? user.UserName`,
 * which often makes `unique_name` an email (e.g., "demo@flygift.test")
 * for users who registered without a full name. We don't want to render
 * that raw in greetings — strip the domain and capitalize the local part
 * so "demo@flygift.test" renders as "Demo".
 */
function prettifyDisplayName(raw: string | undefined | null): string {
    if (!raw) return "";
    // Keep Hebrew / mixed names as-is — only prettify email-style handles.
    if (/[\u0590-\u05FF]/.test(raw)) return raw.trim();
    const local = raw.includes("@") ? raw.split("@")[0] : raw;
    if (!local) return "";
    return local.charAt(0).toUpperCase() + local.slice(1);
}

/**
 * Pull the role + display name out of the JWT cookie and merge into
 * `state.user`. Called on app boot (AppShell) and after login. No-op
 * on the server (no cookies) and for guests (no token).
 */
export function hydrateUserFromJwt(): void {
    const claims = readClaimsFromCookie();
    if (!claims) return;
    const next = prettifyDisplayName(displayNameFromClaims(claims));
    state = {
        ...state,
        user: {
            ...state.user,
            firstName: next || state.user.firstName,
            role: claims.role ?? null,
        },
    };
    emit();
}

/** Update the greeting name after profile save. */
export function setUserDisplayName(name: string): void {
    const trimmed = name.trim();
    if (!trimmed || state.user.firstName === trimmed) return;
    state = { ...state, user: { ...state.user, firstName: trimmed } };
    emit();
}

export function setUserRole(role: UserRole | null): void {
    if (state.user.role === role) return;
    state = { ...state, user: { ...state.user, role } };
    emit();
}

export function selectUpcomingBookings(s: AppState = state): Trip[] {
    return s.bookings.filter((t) => t.isUpcoming);
}

export function selectPastBookings(s: AppState = state): Trip[] {
    return s.bookings.filter((t) => !t.isUpcoming);
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
    bookings: Trip[];
    upcomingBookings: Trip[];
    pastBookings: Trip[];
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
        bookings: s.bookings,
        upcomingBookings: selectUpcomingBookings(s),
        pastBookings: selectPastBookings(s),
        transactions: s.transactions,
        walletBalance: selectWalletBalance(s),
        totalBalance: selectTotalBalance(s),
        activeGiftCount: activeCards.length,
    };
}

/** Re-export the type used by transaction-related views. */
export type { TransactionType };
