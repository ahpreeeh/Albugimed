"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { ActiveStrategy } from '@/types/strategy';

// ─── Storage ─────────────────────────────────────────────────────────
const STORAGE_KEY = 'med-pilot-active-strategy';

// ─── Context shape ───────────────────────────────────────────────────
interface StrategyContextType {
    strategy: ActiveStrategy | null;
    setStrategy: (s: ActiveStrategy) => void;
    clearStrategy: () => void;
    hasStrategy: boolean;
}

const StrategyContext = createContext<StrategyContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────
export const StrategyProvider = ({ children }: { children: ReactNode }) => {
    const [strategy, _setStrategy] = useState<ActiveStrategy | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw) as ActiveStrategy;
                // Guard: ensure this is a valid strategy from the current schema.
                // Old entries (pre-refactor) had 'targetSubjectIds' instead of
                // 'preparationSubjectIds' and will be discarded to avoid runtime errors.
                if (parsed && parsed.mode && Array.isArray(parsed.preparationSubjectIds)) {
                    _setStrategy(parsed);
                } else {
                    // Stale format — clear it so the user sets a fresh strategy
                    localStorage.removeItem(STORAGE_KEY);
                }
            }
        } catch (e) {
            console.error('[StrategyContext] Failed to parse stored strategy', e);
        }
        setIsLoaded(true);
    }, []);

    // Persist to localStorage on change
    useEffect(() => {
        if (!isLoaded) return;
        if (strategy) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(strategy));
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    }, [strategy, isLoaded]);

    const setStrategy = useCallback((s: ActiveStrategy) => {
        _setStrategy(s);
    }, []);

    const clearStrategy = useCallback(() => {
        _setStrategy(null);
    }, []);

    return (
        <StrategyContext.Provider value={{
            strategy,
            setStrategy,
            clearStrategy,
            hasStrategy: strategy !== null,
        }}>
            {children}
        </StrategyContext.Provider>
    );
};

// ─── Hook ────────────────────────────────────────────────────────────
export const useStrategy = () => {
    const ctx = useContext(StrategyContext);
    if (!ctx) throw new Error('useStrategy must be used within a StrategyProvider');
    return ctx;
};
