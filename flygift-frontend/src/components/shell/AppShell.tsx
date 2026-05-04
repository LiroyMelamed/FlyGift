"use client";

import { ReactNode, useEffect } from "react";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";
import { useIsWebView } from "@/hooks/useIsWebView";
import { cn } from "@/utils/cn";

export interface AppShellProps {
    children: ReactNode;
    /** SSR-detected value (passed from a Server Component layout). */
    initialIsWebView?: boolean;
}

export function AppShell({ children, initialIsWebView = false }: AppShellProps) {
    const detectedWebView = useIsWebView();
    const isWebView = initialIsWebView || detectedWebView;

    useEffect(() => {
        if (isWebView) {
            document.documentElement.classList.add("is-webview");
        }
        return () => {
            document.documentElement.classList.remove("is-webview");
        };
    }, [isWebView]);

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
                            "flex-1 px-4 sm:px-6 lg:px-8",
                            "pb-24 lg:pb-12",
                            isWebView && "pb-28"
                        )}
                    >
                        <div className="mx-auto w-full max-w-6xl">{children}</div>
                    </main>
                </div>

                {isWebView && <BottomNav />}
            </div>
        </div>
    );
}
