import type { Config } from "tailwindcss";

const config: Config = {
    content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                // Cinematic Skyline palette
                midnight: {
                    DEFAULT: "#050814",
                    50: "#E6E8F0",
                    100: "#C2C7DC",
                    200: "#8E96BB",
                    300: "#5A6594",
                    400: "#2E3A6B",
                    500: "#1A2350",
                    600: "#0F1638",
                    700: "#0B1228",
                    800: "#070C1C",
                    900: "#050814",
                    950: "#02040C",
                },
                cyan: {
                    jet: "#00E5FF",
                    glow: "#5BF0FF",
                    deep: "#0066FF",
                },
                // Stage 23 — Executive Navy aliases. We KEEP the `gold` token name
                // so existing `text-gold-champagne`, `bg-gold-champagne/15` etc.
                // continue to compile, but they now render Navy.
                gold: {
                    champagne: "#0F172A",
                    deep: "#1E3A8A",
                },
                violet: {
                    aurora: "#7C5CFF",
                },
                // Semantic
                bg: {
                    base: "var(--bg-base)",
                    elevated: "var(--bg-elevated)",
                    glass: "var(--bg-glass)",
                },
                border: {
                    glass: "var(--border-glass)",
                },
                text: {
                    primary: "var(--text-primary)",
                    secondary: "var(--text-secondary)",
                },
                accent: {
                    DEFAULT: "var(--accent-primary)",
                    gold: "var(--accent-gold)",
                    violet: "var(--accent-violet)",
                },
                success: "#34D399",
                danger: "#FF5C7A",
            },
            fontFamily: {
                display: ["var(--font-display)", "ui-sans-serif", "system-ui"],
                sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
                mono: ["var(--font-mono)", "ui-monospace", "monospace"],
                heebo: ["var(--font-heebo)", "ui-sans-serif", "system-ui"],
            },
            fontSize: {
                // 1.250 modular scale
                xs: ["0.75rem", { lineHeight: "1rem" }],
                sm: ["0.875rem", { lineHeight: "1.25rem" }],
                base: ["1rem", { lineHeight: "1.5rem" }],
                lg: ["1.25rem", { lineHeight: "1.75rem" }],
                xl: ["1.5625rem", { lineHeight: "2rem" }],
                "2xl": ["1.9531rem", { lineHeight: "2.25rem" }],
                "3xl": ["2.4414rem", { lineHeight: "2.75rem" }],
                "4xl": ["3.0518rem", { lineHeight: "1.1" }],
                "5xl": ["3.8147rem", { lineHeight: "1.05" }],
                "6xl": ["4.7684rem", { lineHeight: "1" }],
            },
            backgroundImage: {
                "skyline-gradient":
                    "linear-gradient(135deg, #0066FF 0%, #00E5FF 45%, #7C5CFF 100%)",
                "champagne-gradient":
                    "linear-gradient(135deg, #0F172A 0%, #1E3A8A 50%, #0EA5E9 100%)",
                "aurora-1":
                    "radial-gradient(60% 60% at 20% 30%, rgba(0,229,255,0.35) 0%, rgba(0,229,255,0) 60%)",
                "aurora-2":
                    "radial-gradient(50% 50% at 80% 20%, rgba(124,92,255,0.35) 0%, rgba(124,92,255,0) 60%)",
                "aurora-3":
                    "radial-gradient(55% 55% at 50% 90%, rgba(0,102,255,0.35) 0%, rgba(0,102,255,0) 60%)",
            },
            boxShadow: {
                glass: "0 12px 48px rgba(0, 0, 0, 0.35)",
                "glow-cyan": "0 0 24px rgba(0, 229, 255, 0.45)",
                "glow-gold": "0 0 24px rgba(14, 165, 233, 0.35)",
                "glow-danger": "0 0 24px rgba(255, 92, 122, 0.45)",
                "glow-success": "0 0 24px rgba(52, 211, 153, 0.45)",
            },
            backdropBlur: {
                xs: "2px",
            },
            keyframes: {
                "aurora-drift": {
                    "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
                    "33%": { transform: "translate3d(3%, -2%, 0) scale(1.05)" },
                    "66%": { transform: "translate3d(-2%, 3%, 0) scale(0.97)" },
                },
                "pulse-glow": {
                    "0%, 100%": { opacity: "0.6", transform: "scale(1)" },
                    "50%": { opacity: "1", transform: "scale(1.02)" },
                },
                shimmer: {
                    "0%": { backgroundPosition: "-200% 0" },
                    "100%": { backgroundPosition: "200% 0" },
                },
            },
            animation: {
                "aurora-drift": "aurora-drift 18s ease-in-out infinite",
                "pulse-glow": "pulse-glow 2.4s ease-in-out infinite",
                shimmer: "shimmer 2.4s linear infinite",
            },
        },
    },
    plugins: [],
};

export default config;
