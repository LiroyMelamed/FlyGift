/**
 * Bridge between the Next.js web app and the React Native WebView shell.
 *
 * The native shell injects:
 *   window.__FLYGIFT_NATIVE__ = true
 *   window.FlyGiftBridge = { postMessage, saveToken, logout, haptic, share }
 *
 * All calls are no-ops in the browser, so it's always safe to invoke.
 */

type HapticStyle = "light" | "medium" | "heavy" | "success" | "warning" | "error";

type BridgeAPI = {
    postMessage: (msg: unknown) => void;
    saveToken?: (token: string) => void;
    logout?: () => void;
    haptic?: (style: HapticStyle) => void;
    share?: (payload: { title?: string; message?: string; url?: string }) => void;
    shareToStory?: (payload: ShareToStoryPayload) => void;
    notify?: (payload: NotificationPayload) => void;
    openWallet?: (payload: { url: string; type: "apple" | "google" }) => void;
};

export interface ShareToStoryPayload {
    /** Raw base64 PNG (no `data:` prefix). */
    imageBase64: string;
    /**
     * Target social platform. Default "instagram". The native shell may
     * fall back to the OS share sheet when the chosen app isn't installed.
     */
    platform?: "instagram" | "facebook" | "system";
    /** Optional sticker / link to attach (Instagram supports CTA stickers). */
    attributionUrl?: string;
    /** Optional brand-colored background gradient hints. */
    backgroundTopColor?: string;
    backgroundBottomColor?: string;
}

export interface NotificationPayload {
    /** Stable id so the OS dedupes if posted twice. */
    id: string;
    title: string;
    body: string;
    /** Deep-link route inside the WebView, e.g. "/bookings/mine". */
    route?: string;
    /** Local sound name, default "default". */
    sound?: string;
}

declare global {
    interface Window {
        __FLYGIFT_NATIVE__?: boolean;
        FlyGiftBridge?: BridgeAPI;
    }
}

const safe = <T>(fn: () => T): T | undefined => {
    try {
        return fn();
    } catch {
        return undefined;
    }
};

export const isNative = (): boolean =>
    typeof window !== "undefined" && window.__FLYGIFT_NATIVE__ === true;

/** Trigger a browser download for a data: URL. Used as the universal
 *  fallback when neither a native bridge nor the Web Share API is
 *  available. Wrapped in try/catch by the caller. */
function triggerDownload(url: string, filename = "flygift-story.png"): void {
    if (typeof document === "undefined") return;
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
}

export const nativeBridge = {
    isNative,

    /** Persist JWT in the native Keychain / SecureStore. */
    saveToken(token: string): void {
        if (!isNative()) return;
        safe(() =>
            window.FlyGiftBridge?.saveToken?.(token) ??
            window.FlyGiftBridge?.postMessage({ type: "saveToken", token })
        );
    },

    /** Clear native-side credentials and reload the WebView. */
    logout(): void {
        if (!isNative()) return;
        safe(() =>
            window.FlyGiftBridge?.logout?.() ??
            window.FlyGiftBridge?.postMessage({ type: "logout" })
        );
    },

    /** Trigger native haptic feedback. */
    haptic(style: HapticStyle = "light"): void {
        if (!isNative()) return;
        safe(() =>
            window.FlyGiftBridge?.haptic?.(style) ??
            window.FlyGiftBridge?.postMessage({ type: "haptic", style })
        );
    },

    /** Open the native share sheet. */
    share(payload: { title?: string; message?: string; url?: string }): void {
        if (!isNative()) return;
        safe(() =>
            window.FlyGiftBridge?.share?.(payload) ??
            window.FlyGiftBridge?.postMessage({ type: "share", ...payload })
        );
    },

    /**
     * Stage 18 — Share a pre-rendered 9:16 image straight into the
     * Instagram Story composer (or fall back to the OS share sheet on
     * other platforms / when Instagram isn't installed).
     *
     * On the web (no native shell) the image is offered as a download
     * so creators can still post it manually.
     */
    shareToStory(payload: ShareToStoryPayload): boolean {
        if (!isNative()) {
            // Web fallback strategy:
            //  1) Try the Web Share API with the image as a File so users
            //     can share to any installed PWA / native share target.
            //  2) Fall back to a plain download if Web Share isn't
            //     available or the share is cancelled / rejected.
            try {
                const url = `data:image/png;base64,${payload.imageBase64}`;
                const nav = typeof navigator !== "undefined" ? navigator : undefined;

                // Best-effort Web Share with files (async, fire-and-forget).
                if (nav?.share && nav.canShare) {
                    fetch(url)
                        .then((r) => r.blob())
                        .then((blob) => {
                            const file = new File([blob], "flygift-story.png", { type: "image/png" });
                            const data: ShareData = { files: [file], title: "FlyGift" };
                            if (nav.canShare!(data)) {
                                return nav.share!(data);
                            }
                            throw new Error("canShare returned false");
                        })
                        .catch(() => {
                            // Silent fall-through to download below.
                            triggerDownload(url);
                        });
                    return true;
                }

                // No Web Share — go straight to download.
                triggerDownload(url);
                return true;
            } catch {
                return false;
            }
        }
        safe(() =>
            window.FlyGiftBridge?.shareToStory?.(payload) ??
            window.FlyGiftBridge?.postMessage({ type: "shareToStory", ...payload })
        );
        return true;
    },

    /**
     * Schedule / present a local push notification on the native side.
     * On the web this is a no-op so callers can fire-and-forget.
     */
    notify(payload: NotificationPayload): void {
        if (!isNative()) return;
        safe(() =>
            window.FlyGiftBridge?.notify?.(payload) ??
            window.FlyGiftBridge?.postMessage({ type: "notify", ...payload })
        );
    },

    /**
     * Open an Apple .pkpass / Google Wallet save link via the native shell
     * (so iOS hands it to Wallet.app instead of downloading the binary).
     */
    openWallet(payload: { url: string; type: "apple" | "google" }): void {
        if (!isNative()) {
            window.open(payload.url, "_blank", "noopener,noreferrer");
            return;
        }
        safe(() =>
            window.FlyGiftBridge?.openWallet?.(payload) ??
            window.FlyGiftBridge?.postMessage({ ...payload, type: "openWallet" })
        );
    },

    /** Fire a custom event to the native shell. */
    emit(type: string, payload?: Record<string, unknown>): void {
        if (!isNative()) return;
        safe(() => window.FlyGiftBridge?.postMessage({ type, ...payload }));
    },
};
