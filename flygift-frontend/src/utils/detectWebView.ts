import { headers } from "next/headers";

/**
 * Server-side WebView detection. Reads the `x-flygift-client` header
 * injected by the React Native shell, with a User-Agent fallback.
 *
 * Use this in Server Components / layouts so the initial HTML already
 * matches what the native shell expects (no flicker on hydration).
 */
export async function detectWebViewFromHeaders(): Promise<boolean> {
    const h = await headers();
    const customHeader = h.get("x-flygift-client");
    if (customHeader === "mobile") return true;

    const ua = h.get("user-agent") ?? "";
    return /FlyGiftApp/i.test(ua);
}
