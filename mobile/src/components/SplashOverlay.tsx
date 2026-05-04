import React from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { colors } from "../theme";

interface Props {
    message?: string;
}

/**
 * Cinematic loading screen shown over the WebView until the
 * Next.js app finishes its first paint.
 */
export function SplashOverlay({ message = "Preparing your skyline…" }: Props) {
    return (
        <View style={styles.root}>
            {/* Aurora wash */}
            <View style={[styles.aurora, styles.auroraCyan]} />
            <View style={[styles.aurora, styles.auroraViolet]} />
            <View style={[styles.aurora, styles.auroraGold]} />

            <View style={styles.center}>
                <Text style={styles.brand}>FlyGift</Text>
                <ActivityIndicator
                    size="small"
                    color={colors.cyanJet}
                    style={{ marginTop: 18 }}
                />
                <Text style={styles.message}>{message}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.midnight950,
        overflow: "hidden",
    },
    aurora: {
        position: "absolute",
        width: 380,
        height: 380,
        borderRadius: 380,
        opacity: 0.35,
    },
    auroraCyan: {
        backgroundColor: colors.cyanJet,
        top: -120,
        left: -90,
    },
    auroraViolet: {
        backgroundColor: colors.violetAurora,
        bottom: -150,
        right: -120,
    },
    auroraGold: {
        backgroundColor: colors.goldChampagne,
        top: "40%",
        left: "30%",
        opacity: 0.18,
    },
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    brand: {
        fontSize: 32,
        fontWeight: "700",
        letterSpacing: 1,
        color: colors.textPrimary,
    },
    message: {
        marginTop: 12,
        fontSize: 13,
        color: colors.textSecondary,
    },
});
