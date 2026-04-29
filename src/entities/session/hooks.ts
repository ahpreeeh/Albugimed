"use client";

import { useShallow } from 'zustand/shallow';
import { computeTotalElapsedMs, findCurrentTaskIndex, isAllDone } from './model';
import { useSessionStore } from './store';

export function useDailySession() {
    return useSessionStore((state) => state.session);
}

export function useCurrentTask() {
    return useSessionStore(
        useShallow((state) => {
            const currentTaskIndex = state.session
                ? findCurrentTaskIndex(state.session.tasks)
                : -1;
            const currentTask = state.session && currentTaskIndex >= 0
                ? state.session.tasks[currentTaskIndex]
                : null;

            return { currentTask, currentTaskIndex };
        }),
    );
}

export function useAllDone() {
    return useSessionStore((state) =>
        state.session ? isAllDone(state.session.tasks) : false,
    );
}

export function useTotalElapsed() {
    return useSessionStore((state) =>
        state.session ? computeTotalElapsedMs(state.session.tasks) : 0,
    );
}

export function useHasSessionToday(today: string) {
    return useSessionStore((state) => state.session?.date === today);
}

export function useSessionHydrated() {
    return useSessionStore((state) => state.isHydrated);
}

export function useSessionHistory() {
    return useSessionStore((state) => state.history);
}

export function useSessionActions() {
    return useSessionStore(
        useShallow((state) => ({
            hydrate: state.hydrate,
            generateSession: state.generateSession,
            startTask: state.startTask,
            completeTask: state.completeTask,
            skipTask: state.skipTask,
            clearSession: state.clearSession,
            setSession: state.setSession,
        })),
    );
}

export { useSessionStore } from './store';
export type { CompletionPayload, SessionStore } from './store';
