import type { BillingResponse } from "./billingTypes";

const now = Date.now();
const daysAgo = (n: number) => new Date(now - n * 86_400_000).toISOString();

