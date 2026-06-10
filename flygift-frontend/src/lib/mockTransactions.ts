import type { Transaction } from "./transactionTypes";

const now = Date.now();
const daysAgo = (n: number) => new Date(now - n * 86_400_000).toISOString();


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
