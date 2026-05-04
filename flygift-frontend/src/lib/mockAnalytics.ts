import type { AnalyticsResponse } from "./analyticsTypes";

export const MOCK_ANALYTICS: AnalyticsResponse = {
    periodDays: 90,
    generatedAt: new Date().toISOString(),
    summary: {
        totalCards: 184,
        activeCards: 56,
        redeemedCards: 112,
        expiredCards: 16,
        totalDistributed: 92_400,
        redeemedAmount: 61_840,
        unusedAmount: 30_560,
        redemptionRate: 60.9,
        avgGiftAmount: 502.17,
        avgTimeToRedemptionDays: 18.4,
        currency: "USD",
    },
    spendingTrend: [
        { periodStart: weeksAgo(12), distributed: 4800, used: 1200 },
        { periodStart: weeksAgo(11), distributed: 5300, used: 2100 },
        { periodStart: weeksAgo(10), distributed: 6100, used: 3400 },
        { periodStart: weeksAgo(9), distributed: 7400, used: 4900 },
        { periodStart: weeksAgo(8), distributed: 8200, used: 5800 },
        { periodStart: weeksAgo(7), distributed: 7900, used: 6200 },
        { periodStart: weeksAgo(6), distributed: 9100, used: 6500 },
        { periodStart: weeksAgo(5), distributed: 8400, used: 7100 },
        { periodStart: weeksAgo(4), distributed: 9600, used: 7400 },
        { periodStart: weeksAgo(3), distributed: 10200, used: 7800 },
        { periodStart: weeksAgo(2), distributed: 8800, used: 4900 },
        { periodStart: weeksAgo(1), distributed: 6600, used: 2540 },
    ],
    topDestinations: [
        { iata: "CDG", city: "Paris", country: "France", trips: 24 },
        { iata: "LHR", city: "London", country: "UK", trips: 19 },
        { iata: "JFK", city: "New York", country: "USA", trips: 17 },
        { iata: "DXB", city: "Dubai", country: "UAE", trips: 12 },
        { iata: "BCN", city: "Barcelona", country: "Spain", trips: 9 },
        { iata: "NRT", city: "Tokyo", country: "Japan", trips: 7 },
        { iata: "SIN", city: "Singapore", country: "Singapore", trips: 5 },
        { iata: "LAX", city: "Los Angeles", country: "USA", trips: 4 },
    ],
};

function weeksAgo(n: number) {
    const d = new Date();
    d.setDate(d.getDate() - n * 7);
    return d.toISOString();
}
