"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { PrimaryButton, GhostButton } from "@/components/ui/Buttons";
import { AuroraBackground } from "@/components/ui/AuroraBackground";

interface State {
    hasError: boolean;
    message?: string;
}

interface Props {
    children: React.ReactNode;
}

/**
 * Cinematic global error boundary. Wrap layouts with it to catch
 * any unhandled render exception in the React tree.
 */
export class ErrorBoundary extends React.Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, message: error.message };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        if (process.env.NODE_ENV !== "production") {
            console.error("[ErrorBoundary]", error, info.componentStack);
        }
        // Future: send to Sentry / Application Insights here.
    }

    reset = () => this.setState({ hasError: false, message: undefined });

    render() {
        if (!this.state.hasError) return this.props.children;

        return (
            <div className="relative min-h-screen overflow-hidden bg-bg-base">
                <AuroraBackground />
                <div className="relative mx-auto flex min-h-screen max-w-md items-center justify-center px-4 py-10">
                    <GlassCard padding="lg" tone="elevated" className="w-full text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-danger/15 shadow-glow-danger">
                            <AlertTriangle className="h-7 w-7 text-danger" />
                        </div>
                        <h1 className="font-display text-xl font-semibold">
                            <span className="text-gradient-skyline">Turbulence detected</span>
                        </h1>
                        <p className="mt-2 text-sm text-text-secondary">
                            Something unexpected happened. We&apos;ve been notified — try
                            again, or head back to the dashboard.
                        </p>
                        {this.state.message && process.env.NODE_ENV !== "production" && (
                            <pre className="mt-4 overflow-x-auto rounded-lg bg-white/[0.04] p-3 text-left text-[11px] text-text-secondary">
                                {this.state.message}
                            </pre>
                        )}
                        <div className="mt-6 space-y-2">
                            <PrimaryButton type="button" onClick={this.reset}>
                                <RefreshCcw className="h-4 w-4" />
                                Try again
                            </PrimaryButton>
                            <Link href="/dashboard">
                                <GhostButton type="button" className="w-full">
                                    <Home className="h-4 w-4" />
                                    Back to Dashboard
                                </GhostButton>
                            </Link>
                        </div>
                    </GlassCard>
                </div>
            </div>
        );
    }
}
