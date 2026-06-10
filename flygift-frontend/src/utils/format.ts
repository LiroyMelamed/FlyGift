/** Format helpers for money & dates. */

// Stage 24 — Brand pivot to USD. Display the currency the record carries;
// Kiwi is configured with curr=USD so search/check/book prices align.
function normaliseCurrency(c?: string): string {
    const code = (c ?? "USD").trim().toUpperCase();
    if (code === "ILS" || code === "NIS") return "ILS";
    if (code === "EUR") return "EUR";
    return "USD";
}

export function formatCurrency(
    amount: number,
    currency: string = "USD",
    locale: string = "en-US"
): string {
    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: normaliseCurrency(currency),
        maximumFractionDigits: 0,
    }).format(amount);
}

export function formatCurrencyDetailed(
    amount: number,
    currency: string = "USD",
    locale: string = "en-US"
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
