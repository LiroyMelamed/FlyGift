/**
 * Tiny JWT claim reader. The frontend decodes the token client-side
 * just to read non-sensitive identity bits (role, displayName) — never
 * to validate. Validation is the backend's job, gated by the
 * `[Authorize]` attribute on every protected endpoint.
 */

export type UserRole = "Client" | "Company" | "Admin";

export interface JwtClaims {
    nameid?: string; // user id (ClaimTypes.NameIdentifier)
    unique_name?: string;
    /** .NET ClaimTypes.Name — full claim URI in some tokens. */
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"?: string;
    name?: string;
    role?: UserRole;
    exp?: number;
    iss?: string;
    aud?: string;
}

const AUTH_COOKIE_NAME = "flygift_token";

function base64UrlDecode(b64url: string): string {
    const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    return atob(b64 + pad);
}

export function decodeJwt(token: string): JwtClaims | null {
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    try {
        const json = base64UrlDecode(parts[1]);
        return JSON.parse(json) as JwtClaims;
    } catch {
        return null;
    }
}

export function readAuthCookie(): string | null {
    if (typeof document === "undefined") return null;
    const match = document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${AUTH_COOKIE_NAME}=`));
    if (!match) return null;
    return decodeURIComponent(match.split("=")[1] ?? "");
}

export function readClaimsFromCookie(): JwtClaims | null {
    const token = readAuthCookie();
    if (!token) return null;
    const claims = decodeJwt(token);
    if (!claims) return null;
    // Auto-expire — don't act on a stale role if the token is dead.
    if (claims.exp && claims.exp * 1000 < Date.now()) return null;
    return claims;
}

/** Resolve a human display name from JWT claims (Hebrew-safe). */
export function displayNameFromClaims(claims: JwtClaims): string {
    return (
        claims.unique_name ||
        claims.name ||
        claims["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] ||
        ""
    ).trim();
}
