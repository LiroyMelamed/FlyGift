"use client";

import { useEffect, useState } from "react";

/**
 * Detects whether the app is running inside the FlyGift React Native WebView.
 *
 * Detection priority:
 *   1. `window.__FLYGIFT_NATIVE__` injected by the native shell
 *   2. `FlyGiftApp/<version>` token in the User-Agent string
 *
 * Server-side rendering returns `false` initially to avoid hydration mismatch;
 * the value is corrected on mount.
 */
export function useIsWebView(): boolean {
    const [isWebView, setIsWebView] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const detect = () => {
            const flagged = window.__FLYGIFT_NATIVE__ === true;
            const ua = navigator.userAgent || "";
            const matched = /FlyGiftApp/i.test(ua);
            const result = flagged || matched;
            setIsWebView(result);
            if (result) {
                document.documentElement.classList.add("is-webview");
            }
        };

        detect();

        // Native shell may set the flag after the bridge script runs.
        const handler = () => detect();
        window.addEventListener("flygift-bridge-ready", handler);
        return () => window.removeEventListener("flygift-bridge-ready", handler);
    }, []);

    return isWebView;
}
