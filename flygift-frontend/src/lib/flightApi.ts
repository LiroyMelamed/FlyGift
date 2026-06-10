import { ApiUtils } from "@/utils/ApiUtils";
import type {
    FlightSearchRequest,
    FlightSearchResponse,
} from "./flightTypes";
import { t } from "@/i18n/he";

/**
 * Backend envelope shape for `POST /api/FlightSearch`.
 * Mirrors `GeneralResponse` on the .NET side: `Response` is the human
 * message (camelCased to `response`), `Data` is the typed payload.
 */
interface ApiEnvelope<T> {
    success: boolean;
    response?: string; // backend `Response` field — human-readable message
    requestLink?: string;
    data?: T;
}

/**
 * ASP.NET's `[ApiController]` auto-rejects bad bodies with a
 * `ValidationProblemDetails` payload — `errors` is a dict of
 * `Field -> [message, message]`. We surface the first field error
 * verbatim so the user sees *which* field failed.
 */
interface ProblemDetails {
    type?: string;
    title?: string;
    status?: number;
    errors?: Record<string, string[]>;
}

/**
 * Translate axios/fetch failures into a Hebrew user-facing string.
 * Three backend response shapes can produce an error:
 *  1. `GeneralResponse` envelope: `{ success: false, response: "..." }`
 *  2. ASP.NET `ValidationProblemDetails`: `{ errors: { Field: [...] } }`
 *  3. Plain transport failure (no body) — fall back to a generic Hebrew msg.
 */
function extractError(err: unknown): string {
    const e = err as {
        response?: {
            data?:
                | { response?: string; message?: string }
                | ProblemDetails;
            status?: number;
        };
        message?: string;
    };

    const data = e?.response?.data;

    // Shape 2: ValidationProblemDetails — surface the first field error
    // (e.g. "DepartureDate: The DepartureDate field is required.").
    const errors = (data as ProblemDetails | undefined)?.errors;
    if (errors && typeof errors === "object") {
        for (const [field, messages] of Object.entries(errors)) {
            if (Array.isArray(messages) && messages.length > 0) {
                const msg = messages.find((m) => typeof m === "string" && m.trim().length > 0);
                if (msg) return `${field}: ${msg}`;
            }
        }
        const title = (data as ProblemDetails).title;
        if (title) return title;
    }

    // Shape 1: GeneralResponse envelope.
    const envMsg =
        (data as { response?: string; message?: string } | undefined)?.response ??
        (data as { response?: string; message?: string } | undefined)?.message;
    if (envMsg && typeof envMsg === "string" && envMsg.trim().length > 0) {
        return envMsg;
    }

    // Shape 3: transport-only failure.
    if (e?.message && e.message.trim().length > 0) return e.message;
    return t.common.dbError;
}

export const flightApi = {
    /**
     * Real flight search. Backend fans out to every registered
     * `IFlightSearchProvider` (Kiwi Tequila in production, Mock in dev
     * when no API key is present) and returns the unified offer list.
     */
    async search(req: FlightSearchRequest): Promise<FlightSearchResponse> {
        try {
            const env = (await ApiUtils.post("FlightSearch", req).startRequest()) as
                | ApiEnvelope<FlightSearchResponse>
                | FlightSearchResponse;

            // Surface the backend's human message on logical-failure
            // envelopes (HTTP 200 with success=false) instead of the
            // generic transport fallback.
            if (
                typeof (env as ApiEnvelope<FlightSearchResponse>).success === "boolean" &&
                !(env as ApiEnvelope<FlightSearchResponse>).success
            ) {
                throw new Error(
                    (env as ApiEnvelope<FlightSearchResponse>).response ||
                        t.common.dbError
                );
            }

            // Backend wraps the payload in a GeneralResponse envelope.
            // Defensive against a future un-wrapped response shape.
            const payload =
                "data" in (env as object) && (env as ApiEnvelope<FlightSearchResponse>).data
                    ? (env as ApiEnvelope<FlightSearchResponse>).data!
                    : (env as FlightSearchResponse);

            if (!payload || !Array.isArray(payload.offers)) {
                throw new Error(t.common.dbError);
            }
            return payload;
        } catch (err) {
            throw new Error(extractError(err));
        }
    },
};
