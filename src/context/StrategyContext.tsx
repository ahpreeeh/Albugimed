"use client";

import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import type { ActiveStrategy } from '@/types/strategy';
import { isValidStrategy } from '@/entities/strategy/model';
import { useCloudValue } from '@/shared/hooks/useCloudValue';

// ─── Storage key ─────────────────────────────────────────────────────
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
    const { data: rawStrategy, save, clear } = useCloudValue<ActiveStrategy | null>(
        STORAGE_KEY,
        null,
    );

    // Guard : rejeter les stratégies avec l'ancien schéma (pre-refactor).
    // Sémantique extraite vers entities/strategy/model.isValidStrategy (step 2.8+)
    // et couverte par 10 tests unitaires.
    const strategy: ActiveStrategy | null = isValidStrategy(rawStrategy)
        ? rawStrategy
        : null;

    const setStrategy = useCallback(
        (s: ActiveStrategy) => save(s),
        [save],
    );

    const clearStrategy = useCallback(() => clear(), [clear]);

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
