export interface AnalyticsSummary {
    totalCards: number;
    activeCards: number;
    redeemedCards: number;
    expiredCards: number;
    totalDistributed: number;
    redeemedAmount: number;
    unusedAmount: number;
    redemptionRate: number;
    avgGiftAmount: number;
    avgTimeToRedemptionDays: number;
    currency: string;
}

export interface TrendPoint {
    periodStart: string;
    distributed: number;
    used: number;
}

export interface DestinationPoint {
    iata: string;
    city: string;
    country: string;
    trips: number;
}

export interface AnalyticsResponse {
    periodDays: number;
    generatedAt: string;
    summary: AnalyticsSummary;
    spendingTrend: TrendPoint[];
    topDestinations: DestinationPoint[];
}
