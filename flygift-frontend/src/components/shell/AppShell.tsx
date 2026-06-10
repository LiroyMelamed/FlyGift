"use client";

import { ReactNode, useEffect } from "react";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";
import { useIsWebView } from "@/hooks/useIsWebView";
import { hydrateUserFromJwt } from "@/lib/appStore";
import { useHydrateBootstrap } from "@/hooks/useHydrateBootstrap";
import { cn } from "@/utils/cn";

export interface AppShellProps {
    children: ReactNode;
    /** SSR-detected value (passed from a Server Component layout). */
    initialIsWebView?: boolean;
}

export function AppShell({ children, initialIsWebView = false }: AppShellProps) {
    const detectedWebView = useIsWebView();
    const isWebView = initialIsWebView || detectedWebView;

    useHydrateBootstrap();

    useEffect(() => {
        if (isWebView) {
            document.documentElement.classList.add("is-webview");
        }
        return () => {
            document.documentElement.classList.remove("is-webview");
        };
    }, [isWebView]);

    // Pull role + display name out of the JWT cookie on every app
    // boot so the sidebar / dashboard redirect have it before the
    // first interactive render. No-op for guests.
    useEffect(() => {
        hydrateUserFromJwt();
    }, []);

    return (
        <div className="relative min-h-dvh">
            {/* Atmospheric background and ScrollingPlane motif both live
                once at the root layout so landing + app share one sky. */}

            <div className="relative z-10 flex min-h-dvh flex-col">
                <TopBar isWebView={isWebView} />

                <div className="flex flex-1">
                    {!isWebView && <Sidebar />}
                    <main
                        className={cn(
                            "min-w-0 flex-1 px-4 sm:px-6 lg:px-8",
                            // BottomNav is fixed-position and only renders
                            // below `lg`; reserve room for it everywhere
                            // it can show (mobile/tablet web + every webview).
                            "pb-24 lg:pb-12",
                            isWebView && "pb-28"
                        )}
                    >
                        <div className="mx-auto w-full min-w-0 max-w-6xl">{children}</div>
                    </main>
                </div>

                {/*
                  * BottomNav now renders on every viewport below `lg` (not
                  * just webviews) so mobile-browser users get the same
                  * primary nav. The Sidebar handles `lg+`; BottomNav
                  * hides itself there via `lg:hidden`.
                  */}
                <BottomNav />
            </div>
        </div>
    );
}
