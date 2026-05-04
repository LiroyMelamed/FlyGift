/**
 * @deprecated The hardcoded GLOBAL_AIRPORTS array has been removed.
 * Use the live API client in `@/lib/airportsApi` instead.
 *
 * This file remains only to re-export the shared `GlobalAirport` type
 * so existing imports keep working.
 */

export type { GlobalAirport } from "./airportsApi";
export {
    searchAirportsApi as searchGlobalAirports,
    findAirportApi as findAirport,
} from "./airportsApi";
