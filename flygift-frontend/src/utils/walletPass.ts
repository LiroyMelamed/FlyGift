import { ApiUtils } from "@/utils/ApiUtils";
import { nativeBridge } from "@/utils/nativeBridge";

interface ApiEnvelope<T> {
    success?: boolean;
    Success?: boolean;
    response?: string;
    Response?: string;
    data?: T;
    Data?: T;
}

const DEFAULT_APPLE_ERROR = "Apple Wallet אינו זמין כעת.";

function sameOriginApplePassUrl(bookingId: number): string {
    return `/api/wallet/apple/${bookingId}`;
}

async function readApiError(resp: Response, fallback: string): Promise<string> {
    try {
        const body = (await resp.json()) as ApiEnvelope<unknown>;
        return body.response || body.Response || fallback;
    } catch {
        return fallback;
    }
}

/**
 * Download / open an Apple Wallet (.pkpass) for a booking.
 * iOS Safari must navigate to a same-origin URL with
 * `application/vnd.apple.pkpass` — blob URLs and cross-origin API
 * URLs fail with "Safari cannot download this file".
 */
export async function openAppleWalletPass(bookingId: number): Promise<void> {
    const proxyUrl = sameOriginApplePassUrl(bookingId);
    const directApiUrl = ApiUtils.apiUrl(`Bookings/${bookingId}/wallet-pass`);

    if (nativeBridge.isNative()) {
        nativeBridge.openWallet({ type: "apple", url: directApiUrl });
        return;
    }

    const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    const resp = await fetch(proxyUrl, { credentials: "include", cache: "no-store" });
    if (!resp.ok) {
        throw new Error(await readApiError(resp, DEFAULT_APPLE_ERROR));
    }

    const contentType = resp.headers.get("content-type") ?? "";
    if (!contentType.includes("pkpass")) {
        throw new Error(await readApiError(resp, DEFAULT_APPLE_ERROR));
    }

    if (isIos) {
        // Prefetch validated the response; navigate so Safari hands off to Wallet.
        window.location.assign(proxyUrl);
        return;
    }

    const blob = await resp.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `flygift-boarding-${bookingId}.pkpass`;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

/**
 * Resolve the Google Wallet save URL via the backend, then open it.
 */
export async function openGoogleWalletPass(bookingId: number): Promise<void> {
    const env = (await ApiUtils.get(`Bookings/${bookingId}/wallet-link/google`).startRequest()) as ApiEnvelope<{
        url?: string;
    }>;

    const ok = env?.success ?? env?.Success;
    const link = env?.data?.url ?? env?.Data?.url;
    if (ok === false || !link) {
        throw new Error(env?.response || env?.Response || "Google Wallet אינו זמין כעת.");
    }

    if (nativeBridge.isNative()) {
        nativeBridge.openWallet({ type: "google", url: link });
        return;
    }

    window.open(link, "_blank", "noopener,noreferrer");
}
