"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";

export type Theme = "light" | "dark";

interface ThemeContextValue {
    theme: Theme;
    setTheme: (t: Theme) => void;
    toggleTheme: () => void;
    isLight: boolean;
    isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "flygift-theme";

export function ThemeProvider({
    children,
    defaultTheme = "dark",
}: {
    children: ReactNode;
    defaultTheme?: Theme;
}) {
    const [theme, setThemeState] = useState<Theme>(defaultTheme);
    const [hydrated, setHydrated] = useState(false);

    // Hydrate from localStorage on mount.
    useEffect(() => {
        try {
            const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
            if (stored === "light" || stored === "dark") {
                setThemeState(stored);
            }
        } catch {
            /* ignore */
        }
        setHydrated(true);
    }, []);

    // Apply class to <html> so Tailwind `dark:` and our CSS-var `.light` swap work together.
    useEffect(() => {
        if (!hydrated) return;
        const root = document.documentElement;
        root.classList.toggle("dark", theme === "dark");
        root.classList.toggle("light", theme === "light");
        root.style.colorScheme = theme;
        try {
            window.localStorage.setItem(STORAGE_KEY, theme);
        } catch {
            /* ignore */
        }
    }, [theme, hydrated]);

    const setTheme = useCallback((t: Theme) => setThemeState(t), []);
    const toggleTheme = useCallback(
        () => setThemeState((prev) => (prev === "dark" ? "light" : "dark")),
        []
    );

    const value = useMemo<ThemeContextValue>(
        () => ({
            theme,
            setTheme,
            toggleTheme,
            isLight: theme === "light",
            isDark: theme === "dark",
        }),
        [theme, setTheme, toggleTheme]
    );

    return (
        <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    );
}

export function useTheme(): ThemeContextValue {
    const ctx = useContext(ThemeContext);
    if (!ctx) {
        // Safe fallback for components rendered outside the provider (e.g. shell)
        return {
            theme: "dark",
            setTheme: () => { },
            toggleTheme: () => { },
            isLight: false,
            isDark: true,
        };
    }
    return ctx;
}
