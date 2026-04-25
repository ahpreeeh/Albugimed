"use client";

import { useEffect, useRef, useState } from 'react';
import { Clock } from 'lucide-react';

export function useSessionTimer(startedAt: number | null, isPaused: boolean): number {
    const [now, setNow] = useState(() => Date.now());
    const pauseAccumRef = useRef(0);
    const pauseStartRef = useRef<number | null>(null);
    const frozenElapsedRef = useRef<number | null>(null);
    const lastStartedAtRef = useRef<number | null>(null);

    useEffect(() => {
        if (lastStartedAtRef.current !== startedAt) {
            pauseAccumRef.current = 0;
            pauseStartRef.current = null;
            frozenElapsedRef.current = null;
            lastStartedAtRef.current = startedAt;
        }
    }, [startedAt]);

    useEffect(() => {
        if (!startedAt) return;
        if (isPaused) {
            frozenElapsedRef.current = Date.now() - startedAt - pauseAccumRef.current;
            pauseStartRef.current = Date.now();
        } else if (pauseStartRef.current !== null) {
            pauseAccumRef.current += Date.now() - pauseStartRef.current;
            pauseStartRef.current = null;
            frozenElapsedRef.current = null;
            setNow(Date.now());
        }
    }, [isPaused, startedAt]);

    useEffect(() => {
        if (!startedAt || isPaused) return;
        setNow(Date.now());
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, [startedAt, isPaused]);

    if (!startedAt) return 0;
    if (isPaused && frozenElapsedRef.current !== null) {
        return frozenElapsedRef.current;
    }
    return Math.max(0, now - startedAt - pauseAccumRef.current);
}

export function formatTime(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}m ${String(sec).padStart(2, '0')}s`;
}

interface SessionTimerProps {
    elapsedMs: number;
    isPaused: boolean;
}

export const SessionTimer = ({ elapsedMs, isPaused }: SessionTimerProps) => (
    <span className="flex items-center gap-1.5 text-[var(--color-accent)] font-mono">
        <Clock className="h-3.5 w-3.5 animate-pulse" />
        {formatTime(elapsedMs)}
        {isPaused && <span className="text-amber-500 text-[10px] ml-1 uppercase font-bold tracking-wider">(En pause)</span>}
    </span>
);
