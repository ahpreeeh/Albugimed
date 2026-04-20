"use client";

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useLayoutEffect,
    useMemo,
    type ReactNode,
} from 'react';
import { useSubjects } from '@/entities/subject/hooks';
import { useStrategy } from '@/entities/strategy/hooks';
import type { DayLoad } from '@/entities/strategy/types';
import type {
    DailySession,
    SessionTask,
    DifficultyRating,
} from '@/types/session';
import { toLocalISOString } from '@/shared/lib/dates';
import {
    useAllDone,
    useCurrentTask,
    useDailySession,
    useHasSessionToday,
    useSessionActions,
    useTotalElapsed,
    useSessionStore,
} from '@/entities/session/hooks';

interface SessionEngineContextType {
    /** The current day's session (null if not generated yet) */
    session: DailySession | null;
    /** Generate a new session for today with the given load */
    generateSession: (load: DayLoad) => void;
    /** Mark the current task as started */
    startCurrentTask: () => void;
    /** Complete the current task with a difficulty rating */
    completeCurrentTask: (rating: DifficultyRating) => void;
    /** Skip the current task */
    skipCurrentTask: () => void;
    /** The current active task (first non-done/skipped) */
    currentTask: SessionTask | null;
    /** Index of the current task */
    currentTaskIndex: number;
    /** Whether all tasks are done */
    allDone: boolean;
    /** Total elapsed time for today's session in ms */
    totalElapsedMs: number;
    /** Whether a session exists for today */
    hasSessionToday: boolean;
}

const SessionEngineContext = createContext<SessionEngineContextType | undefined>(undefined);

export const SessionEngineProvider = ({ children }: { children: ReactNode }) => {
    const { subjects, updateChapterProgress } = useSubjects();
    const { strategy } = useStrategy();

    const session = useDailySession();
    const { currentTask, currentTaskIndex } = useCurrentTask();
    const allDone = useAllDone();
    const totalElapsedMs = useTotalElapsed();
    const today = toLocalISOString(new Date());
    const hasSessionToday = useHasSessionToday(today);
    const {
        hydrate,
        generateSession: generateStoreSession,
        startTask,
        completeTask,
        skipTask,
    } = useSessionActions();

    // Reset the singleton store before the façade hydrates it, so remounts do not
    // briefly expose stale in-memory state from a previous provider instance.
    useLayoutEffect(() => {
        useSessionStore.setState({
            session: null,
            history: [],
            isHydrated: false,
        });
    }, [today]);

    useEffect(() => {
        void hydrate(today);
    }, [hydrate, today]);

    const generateSession = useCallback((load: DayLoad) => {
        if (!strategy) return;
        generateStoreSession(strategy, subjects, load, today);
    }, [generateStoreSession, strategy, subjects, today]);

    const startCurrentTask = useCallback(() => {
        if (!currentTask) return;
        startTask(currentTask.id);
    }, [currentTask, startTask]);

    const completeCurrentTask = useCallback((rating: DifficultyRating) => {
        if (!currentTask) return;

        const completion = completeTask(currentTask.id, rating);
        if (!completion) return;

        updateChapterProgress(
            completion.subjectId,
            completion.chapterId,
            completion.progressUpdate,
        );
    }, [completeTask, currentTask, updateChapterProgress]);

    const skipCurrentTask = useCallback(() => {
        if (!currentTask) return;
        skipTask(currentTask.id);
    }, [currentTask, skipTask]);

    const value = useMemo<SessionEngineContextType>(() => ({
        session,
        generateSession,
        startCurrentTask,
        completeCurrentTask,
        skipCurrentTask,
        currentTask,
        currentTaskIndex,
        allDone,
        totalElapsedMs,
        hasSessionToday,
    }), [
        allDone,
        completeCurrentTask,
        currentTask,
        currentTaskIndex,
        generateSession,
        hasSessionToday,
        session,
        skipCurrentTask,
        startCurrentTask,
        totalElapsedMs,
    ]);

    return (
        <SessionEngineContext.Provider value={value}>
            {children}
        </SessionEngineContext.Provider>
    );
};

export const useSessionEngine = () => {
    const ctx = useContext(SessionEngineContext);
    if (!ctx) throw new Error('useSessionEngine must be used within a SessionEngineProvider');
    return ctx;
};
