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

export function middleware(req: NextRequest) {
    const { pathname, search } = req.nextUrl;

    if (
        PUBLIC_PATHS.has(pathname) ||
        PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
    ) {
        return NextResponse.next();
    }

    const token = req.cookies.get("flygift_token")?.value;
    if (token) return NextResponse.next();

    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(loginUrl);
}

export const config = {
    // Run on every request except static files & internal next assets.
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
