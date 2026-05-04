"use client";

import type { ReactNode } from "react";
import { LoginOverlayProvider } from "./LoginOverlayContext";
import { LoginOverlay } from "./LoginOverlay";

export function LandingShell({ children }: { children: ReactNode }) {
    return (
        <LoginOverlayProvider>
            {children}
            <LoginOverlay />
        </LoginOverlayProvider>
    );
}
