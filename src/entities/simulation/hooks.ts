"use client";

import { useState, useEffect, useCallback } from "react";
import { loadErrorBank, saveErrorBank } from "./api";
import type { ErrorEntry } from "./types";

const ERROR_BANK_KEY = "med-pilot-error-bank";

export interface UseErrorBankResult {
    errors: ErrorEntry[];
    save: (next: ErrorEntry[]) => void;
    isReady: boolean;
}

export function useErrorBank(): UseErrorBankResult {
    const [errors, setErrors] = useState<ErrorEntry[]>([]);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(ERROR_BANK_KEY);
            if (raw !== null) setErrors(JSON.parse(raw) as ErrorEntry[]);
        } catch {
            // ignore
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        loadErrorBank()
            .then(loaded => {
                if (cancelled) return;
                setErrors(loaded);
                try {
                    localStorage.setItem(ERROR_BANK_KEY, JSON.stringify(loaded));
                } catch {
                    // ignore
                }
            })
            .catch(err => console.warn("[useErrorBank] load échoué", err))
            .finally(() => {
                if (!cancelled) setIsReady(true);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const save = useCallback((next: ErrorEntry[]) => {
        setErrors(next);
        try {
            localStorage.setItem(ERROR_BANK_KEY, JSON.stringify(next));
        } catch {
            // ignore
        }
        saveErrorBank(next).catch(err => console.warn("[useErrorBank] save échoué", err));
    }, []);

    return { errors, save, isReady };
}
