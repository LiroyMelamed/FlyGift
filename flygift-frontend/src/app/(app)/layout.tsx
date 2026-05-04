import { ReactNode } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { OfflineOverlay } from "@/components/ui/OfflineOverlay";
import { detectWebViewFromHeaders } from "@/utils/detectWebView";

export default async function AppGroupLayout({
    children,
}: {
    children: ReactNode;
}) {
    const isWebView = await detectWebViewFromHeaders();
    return (
        <ErrorBoundary>
            <OfflineOverlay />
            <AppShell initialIsWebView={isWebView}>{children}</AppShell>
        </ErrorBoundary>
    );
}
