/** Format helpers for money & dates. */

// Stage 23 — Israeli Shekel (₪) is the canonical FlyGift currency.
// All callers default to ILS unless they explicitly pass another code.
// USD inputs are normalised so legacy mock data still renders in ₪.
function normaliseCurrency(c?: string): string {
    if (!c) return "ILS";
    const up = c.toUpperCase();
    return up === "USD" ? "ILS" : up;
}

export function formatCurrency(
    amount: number,
    currency: string = "ILS",
    locale: string = "he-IL"
): string {
    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: normaliseCurrency(currency),
        maximumFractionDigits: 0,
    }).format(amount);
}

export function formatCurrencyDetailed(
    amount: number,
    currency: string = "ILS",
    locale: string = "he-IL"
): string {
    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: normaliseCurrency(currency),
    }).format(amount);
}

export function formatRelativeDate(iso: string): string {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 1) return "היום";
    if (diffDays === 1) return "אתמול";
    if (diffDays < 7) return `לפני ${diffDays} ימים`;
    if (diffDays < 30) return `לפני ${Math.floor(diffDays / 7)} שבועות`;
    return d.toLocaleDateString("he-IL", { month: "short", day: "numeric" });
}

export function formatExpiration(iso: string): string {
    return new Date(iso).toLocaleDateString("he-IL", {
        month: "short",
        year: "numeric",
    });
}
