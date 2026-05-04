"use client";

import { CloudsBackground } from "@/components/ui/CloudsBackground";
import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { StarField } from "@/components/ui/StarField";
import { useTheme } from "@/theme/ThemeProvider";

/**
 * Site-wide atmospheric background — fixed full-viewport layer that spans
 * landing, dashboard, login, register, etc. so every page shares the same
 * cinematic sky. Dark = navy + aurora + twinkling stars. Light = pastel
 * gradient + drifting clouds + soft cyan/violet washes.
 */
export function GlobalBackground() {
    const { isDark } = useTheme();
    return (
        <div
            aria-hidden
            className="fixed inset-0 -z-10 overflow-hidden"
            style={
                isDark
                    ? {
                        background:
                            "radial-gradient(ellipse 120% 80% at 50% 110%, rgba(0,229,255,0.18) 0%, rgba(0,102,255,0.10) 30%, rgba(2,16,36,0) 65%), linear-gradient(to bottom, #020617 0%, #050B24 60%, #02060F 100%)",
                    }
                    : {
                        background:
                            "linear-gradient(180deg, #BAE6FD 0%, #E0F2FE 35%, #F8FBFF 100%)",
                    }
            }
        >
            {isDark ? (
                <>
                    <AuroraBackground intensity={0.55} vignette={false} />
                    <StarField count={180} />
                </>
            ) : (
                <>
                    <CloudsBackground />
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0"
                        style={{
                            background:
                                "radial-gradient(ellipse 50% 40% at 80% 80%, rgba(124,92,255,0.08) 0%, transparent 60%), radial-gradient(ellipse 40% 35% at 15% 90%, rgba(14,165,233,0.10) 0%, transparent 60%)",
                        }}
                    />
                </>
            )}
        </div>
    );
}
