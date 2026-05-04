import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    BackHandler,
    Platform,
    StyleSheet,
    View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { APP_URL, colors } from "./src/theme";
import {
    INJECTED_BRIDGE,
    handleBridgeMessage,
} from "./src/bridge/handler";
import { SplashOverlay } from "./src/components/SplashOverlay";

SplashScreen.preventAutoHideAsync().catch(() => {
    /* ignore */
});

const USER_AGENT_SUFFIX = "FlyGiftApp/0.1 (Expo)";

export default function App() {
    const webRef = useRef<WebView | null>(null);
    const [loaded, setLoaded] = useState(false);
    const canGoBackRef = useRef(false);

    // ---- Android hardware back ----
    useEffect(() => {
        if (Platform.OS !== "android") return;
        const sub = BackHandler.addEventListener("hardwareBackPress", () => {
            if (canGoBackRef.current && webRef.current) {
                webRef.current.goBack();
                return true; // we handled it
            }
            return false; // let the OS exit the app
        });
        return () => sub.remove();
    }, []);

    // ---- Native splash hides as soon as our overlay is mounted ----
    useEffect(() => {
        SplashScreen.hideAsync().catch(() => {
            /* ignore */
        });
    }, []);

    const onMessage = useCallback((e: WebViewMessageEvent) => {
        handleBridgeMessage(e.nativeEvent.data, () => webRef.current);
    }, []);

    return (
        <SafeAreaProvider>
            <View style={styles.root}>
                <StatusBar style="light" backgroundColor={colors.midnight950} />

                <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
                    <WebView
                        ref={webRef}
                        source={{
                            uri: APP_URL,
                            headers: { "x-flygift-client": "mobile" },
                        }}
                        injectedJavaScriptBeforeContentLoaded={INJECTED_BRIDGE}
                        onMessage={onMessage}
                        onLoadEnd={() => setLoaded(true)}
                        onNavigationStateChange={(s) => {
                            canGoBackRef.current = s.canGoBack;
                        }}
                        applicationNameForUserAgent={USER_AGENT_SUFFIX}
                        allowsBackForwardNavigationGestures
                        decelerationRate="normal"
                        javaScriptEnabled
                        domStorageEnabled
                        originWhitelist={["https://*", "http://*"]}
                        setSupportMultipleWindows={false}
                        style={styles.webview}
                        containerStyle={styles.webviewContainer}
                        // iOS only — match the dark theme so swipe-back doesn't flash white
                        scrollEnabled
                        // Bounce off the dark background, not white
                        // @ts-ignore — RN-WebView prop on iOS
                        contentInsetAdjustmentBehavior="never"
                    />

                    {!loaded && <SplashOverlay />}
                </SafeAreaView>
            </View>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: colors.midnight950,
    },
    safe: {
        flex: 1,
        backgroundColor: colors.midnight950,
    },
    webview: {
        flex: 1,
        backgroundColor: colors.midnight950,
    },
    webviewContainer: {
        backgroundColor: colors.midnight950,
    },
});
