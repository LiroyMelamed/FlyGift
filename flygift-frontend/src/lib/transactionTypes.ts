export type TransactionType = "Load" | "Spend" | "Refund" | "Adjustment";

export interface Transaction {
    id: number;
    userId: number;
    type: TransactionType;
    amount: number;
    currency: string;
    relatedGiftCardId?: number | null;
    transactionReference?: string | null;
    balanceAfter: number;
    isReversal: boolean;
    reversesTransactionId?: number | null;
    description?: string | null;
    createdAt: string;
}

export const TX_SIGN: Record<TransactionType, 1 | -1> = {
    Load: 1,
    Refund: 1,
    Adjustment: 1,
    Spend: -1,
};
