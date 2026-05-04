/**
 * Messages received from the web app via window.FlyGiftBridge.postMessage.
 *
 * Mirrors the producer side at:
 *   flygift-frontend/src/utils/nativeBridge.ts
 */

export type HapticStyle =
    | "light"
    | "medium"
    | "heavy"
    | "success"
    | "warning"
    | "error";

export type BridgeMessage =
    | { type: "saveToken"; token: string }
    | { type: "getToken" }
    | { type: "logout" }
    | { type: "haptic"; style: HapticStyle }
    | { type: "share"; title?: string; message?: string; url?: string }
    | {
        type: "shareToStory";
        imageBase64: string;
        platform?: "instagram" | "facebook" | "system";
        attributionUrl?: string;
        backgroundTopColor?: string;
        backgroundBottomColor?: string;
    }
    | { type: string;[key: string]: unknown };
