import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";
import { Platform, Share } from "react-native";
import Share2, { Social } from "react-native-share";
import type WebView from "react-native-webview";
import type { BridgeMessage, HapticStyle } from "./types";

const TOKEN_KEY = "flygift.jwt";

/**
 * Map a web-side haptic style to expo-haptics.
 * Falls back to a light impact for unknown values.
 */
async function fireHaptic(style: HapticStyle): Promise<void> {
    switch (style) {
        case "success":
            return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        case "warning":
            return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        case "error":
            return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        case "heavy":
            return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        case "medium":
            return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        case "light":
        default:
            return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
}

/** Push a JS payload back into the WebView (one-way reply). */
function postToWeb(webview: WebView | null, payload: unknown): void {
    if (!webview) return;
    const safe = JSON.stringify(payload).replace(/</g, "\\u003C");
    webview.injectJavaScript(`
    window.dispatchEvent(new MessageEvent('flygift-bridge-message', { data: ${safe} }));
    true;
  `);
}

/**
 * Handle a message arriving from the WebView.
 *
 * Pass `getWebView` rather than the ref directly so callbacks
 * always read the current ref value.
 */
export async function handleBridgeMessage(
    raw: string,
    getWebView: () => WebView | null
): Promise<void> {
    let msg: BridgeMessage;
    try {
        msg = JSON.parse(raw) as BridgeMessage;
    } catch {
        if (__DEV__) console.warn("[FlyGiftBridge] invalid JSON:", raw);
        return;
    }

    try {
        switch (msg.type) {
            case "haptic": {
                await fireHaptic((msg.style as HapticStyle) ?? "light");
                return;
            }

            case "saveToken": {
                if (typeof msg.token === "string" && msg.token.length > 0) {
                    await SecureStore.setItemAsync(TOKEN_KEY, msg.token);
                }
                return;
            }

            case "getToken": {
                const token = await SecureStore.getItemAsync(TOKEN_KEY);
                postToWeb(getWebView(), { type: "token", token });
                return;
            }

            case "logout": {
                await SecureStore.deleteItemAsync(TOKEN_KEY);
                // Optional: reload the WebView to log the user out.
                getWebView()?.reload();
                return;
            }

            case "share": {
                await Share.share({
                    title: msg.title,
                    message:
                        [msg.message, msg.url].filter(Boolean).join(" ") ||
                        "Check out FlyGift",
                    url: msg.url,
                });
                return;
            }

            case "shareToStory": {
                // Stage 18 — Viral social sharing.
                // Open the Instagram Story composer with the rendered 9:16
                // image as the background sticker. Falls back to the OS share
                // sheet when Instagram isn't installed (or on Android web view).
                const base64 = String(msg.imageBase64 ?? "");
                if (!base64) return;
                const dataUrl = `data:image/png;base64,${base64}`;
                const platform = (msg.platform as string) ?? "instagram";
                const social =
                    platform === "facebook"
                        ? Social.FacebookStories
                        : Social.InstagramStories;

                try {
                    await Share2.shareSingle({
                        social,
                        backgroundImage: dataUrl,
                        // Sticker is optional; we let the background image be the hero.
                        backgroundTopColor:
                            (msg.backgroundTopColor as string) ?? "#02061A",
                        backgroundBottomColor:
                            (msg.backgroundBottomColor as string) ?? "#000208",
                        attributionURL:
                            (msg.attributionUrl as string) ?? "https://flygift.com",
                        appId: "com.flygift.app", // required by IG — replace with your real FB App ID.
                    });
                    postToWeb(getWebView(), { type: "shareToStory:done", ok: true });
                } catch (err) {
                    if (__DEV__) console.warn("[FlyGiftBridge] IG story failed:", err);
                    // Fallback — OS share sheet with the image attached.
                    try {
                        await Share2.open({
                            url: dataUrl,
                            type: "image/png",
                            failOnCancel: false,
                            social: Platform.OS === "ios" ? undefined : undefined,
                        });
                        postToWeb(getWebView(), {
                            type: "shareToStory:done",
                            ok: true,
                            fallback: true,
                        });
                    } catch (fallbackErr) {
                        if (__DEV__)
                            console.warn("[FlyGiftBridge] share fallback failed:", fallbackErr);
                        postToWeb(getWebView(), { type: "shareToStory:done", ok: false });
                    }
                }
                return;
            }

            default:
                if (__DEV__) console.log("[FlyGiftBridge] unhandled:", msg);
        }
    } catch (err) {
        if (__DEV__) console.warn("[FlyGiftBridge] handler error:", err);
    }
}

/**
 * JS injected before the page loads. Exposes:
 *   window.__FLYGIFT_NATIVE__ = true
 *   window.FlyGiftBridge = { postMessage, saveToken, logout, haptic, share }
 *
 * The web side checks `window.__FLYGIFT_NATIVE__` to render the WebView UI.
 */
export const INJECTED_BRIDGE = `
(function () {
  if (window.__FLYGIFT_NATIVE__) return;
  window.__FLYGIFT_NATIVE__ = true;

  function send(payload) {
    try {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    } catch (e) {
      // no-op
    }
  }

  window.FlyGiftBridge = {
    postMessage: function (msg) { send(msg); },
    saveToken: function (token) { send({ type: 'saveToken', token: token }); },
    getToken:  function () { send({ type: 'getToken' }); },
    logout:    function () { send({ type: 'logout' }); },
    haptic:    function (style) { send({ type: 'haptic', style: style || 'light' }); },
    share:     function (p) { send({ type: 'share', title: p && p.title, message: p && p.message, url: p && p.url }); },
    shareToStory: function (p) {
      send({
        type: 'shareToStory',
        imageBase64: p && p.imageBase64,
        platform: (p && p.platform) || 'instagram',
        attributionUrl: p && p.attributionUrl,
        backgroundTopColor: p && p.backgroundTopColor,
        backgroundBottomColor: p && p.backgroundBottomColor
      });
    }
  };

  // Notify the web app that the bridge is live.
  window.dispatchEvent(new Event('flygift-bridge-ready'));
})();
true;
`;
