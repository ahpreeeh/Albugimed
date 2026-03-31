"use client";

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import {
    DEFAULT_THEME,
    THEME_STORAGE_KEY,
    resolveTheme,
    type ThemeId,
} from "@/lib/theme";

interface ThemeContextValue {
    theme: ThemeId;
    setTheme: (theme: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const getInitialTheme = (): ThemeId => {
    if (typeof document !== "undefined") {
        return resolveTheme(document.documentElement.getAttribute("data-theme"));
    }
    return DEFAULT_THEME;
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const [theme, setThemeState] = useState<ThemeId>(getInitialTheme);

    const setTheme = useCallback((nextTheme: ThemeId) => {
        setThemeState(resolveTheme(nextTheme));
    }, []);

    useEffect(() => {
        const resolved = resolveTheme(theme);
        document.documentElement.setAttribute("data-theme", resolved);
        window.localStorage.setItem(THEME_STORAGE_KEY, resolved);
    }, [theme]);

    const value = useMemo<ThemeContextValue>(
        () => ({ theme, setTheme }),
        [theme, setTheme],
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
};
