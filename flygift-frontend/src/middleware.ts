import { NextResponse, type NextRequest } from "next/server";

/**
 * Auth gate. Any request to a protected route without a `flygift_token`
 * cookie is bounced to /login (carrying the original URL as `?next=`).
 *
 * The token is set after a successful POST /api/Auth/Login by /login/page.tsx.
 */
const PUBLIC_PATHS = new Set<string>([
    "/",          // marketing landing page
    "/login",
    "/register",
]);

const PUBLIC_PREFIXES = [
    "/_next",
    "/api",       // (none right now, but reserved)
    "/favicon",
    "/manifest",
    "/static",
    "/assets",
    "/apple-touch-icon",
];

/** Decode a JWT (no validation — that's the backend's job) just enough
 * to read the `role` claim for routing decisions at the edge. */
function readRoleFromToken(token: string): string | null {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    try {
        const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
        const json =
            typeof atob === "function"
                ? atob(b64 + pad)
                : Buffer.from(b64 + pad, "base64").toString("utf8");
        const claims = JSON.parse(json) as { role?: string; exp?: number };
        if (claims.exp && claims.exp * 1000 < Date.now()) return null;
        return claims.role ?? null;
    } catch {
        return null;
    }
}

export function middleware(req: NextRequest) {
    const { pathname, search } = req.nextUrl;

    if (
        PUBLIC_PATHS.has(pathname) ||
        PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
    ) {
        return NextResponse.next();
    }

    const token = req.cookies.get("flygift_token")?.value;
    if (!token) {
        const loginUrl = req.nextUrl.clone();
        loginUrl.pathname = "/login";
        loginUrl.search = `?next=${encodeURIComponent(pathname + search)}`;
        return NextResponse.redirect(loginUrl);
    }

    // Company users hitting /dashboard get redirected to their analytics
    // home, since the consumer dashboard's wallet/gifts views don't apply.
    if (pathname === "/dashboard") {
        const role = readRoleFromToken(token);
        if (role === "Company") {
            const url = req.nextUrl.clone();
            url.pathname = "/company/dashboard";
            url.search = "";
            return NextResponse.redirect(url);
        }
    }

    return NextResponse.next();
}

export const config = {
    // Run on every request except static files & internal next assets.
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
