// ─── Session entity — Zustand store ──────────────────────────────────
// State central pour la session quotidienne + historique.
// Compose `model.ts` (logique pure) + `api.ts` (persistance cloud).
//
// Persistance : pattern miroir de useCloudValue (localStorage instant +
// cloud authoritative) pour préserver l'UX de reload rapide de l'ancien
// SessionEngineContext. Pas de `persist` middleware Zustand : actions
// appellent explicitement api.ts + localStorage, comme SubjectContext.
//
// Règle dure : AUCUN cross-store read. Toutes les données dont le store
// a besoin (strategy, subjects, today) arrivent en paramètres depuis le
// hook d'orchestration. Voir plan Phase 3 pour le rationale.
//
// Dormant en step 3.5 (Lot O) : pas encore câblé à SessionEngineContext.
// Câblage = Lot Q (façade), smoke obligatoire.

"use client";

import { create } from 'zustand';
import { STORAGE_KEYS } from '@/shared/config/storageKeys';
import { toLocalISOString } from '@/shared/lib/dates';
import {
    applyTaskCompletion,
    generateDailyTasks,
} from './model';
import {
    loadDailySession,
    saveDailySession,
    clearDailySession,
    loadSessionHistory,
    appendSessionHistory,
    SESSION_HISTORY_MAX,
} from './api';
import type {
    DailySession,
    DifficultyRating,
    SessionHistoryEntry,
} from './types';
import type { Subject, ChapterProgress } from '@/entities/subject/types';
import type { ActiveStrategy, DayLoad } from '@/entities/strategy/types';

const SESSION_KEY = STORAGE_KEYS.session.daily;
const HISTORY_KEY = STORAGE_KEYS.session.history;

// ─── State + actions types ───────────────────────────────────────────

/**
 * Payload retourné par `completeTask` : porte l'update de chapter progress
 * à appliquer EXTERNALLY (par le hook d'orchestration, via updateChapterProgress
 * de SubjectContext). Le store ne touche jamais au SubjectContext directement.
 */
export interface CompletionPayload {
    subjectId: string;
    chapterId: string;
    progressUpdate: Partial<ChapterProgress>;
}

interface SessionState {
    session: DailySession | null;
    history: SessionHistoryEntry[];
    isHydrated: boolean;
}

interface SessionActions {
    /**
     * Hydrate depuis localStorage (instantané) puis depuis le cloud
     * (override si valeur cloud existe et date === today).
     * Idempotent : safe à appeler plusieurs fois.
     */
    hydrate: (today: string) => Promise<void>;

    /**
     * Génère une session pour `today` à partir de la stratégie + subjects + load.
     * Toutes les dépendances arrivent en paramètres (pas de cross-store read).
     */
    generateSession: (
        strategy: ActiveStrategy,
        subjects: Subject[],
        load: DayLoad,
        today: string,
        now?: number,
    ) => void;

    /** Passe une tâche en status='in-progress' + startedAt. */
    startTask: (taskId: string, now?: number) => void;

    /**
     * Complète une tâche. Retourne le payload à appliquer sur la ChapterProgress
     * (le store NE touche PAS à SubjectContext, c'est le rôle de l'orchestrateur).
     * Retourne `null` si aucune session ou si taskId introuvable.
     */
    completeTask: (
        taskId: string,
        rating: DifficultyRating,
        now?: number,
    ) => CompletionPayload | null;

    /** Passe une tâche en status='skipped' (sans timing). */
    skipTask: (taskId: string) => void;

    /** Vide la session courante (cloud + local). */
    clearSession: () => void;

    /**
     * Force le remplacement complet de la session (utilisé par la façade
     * pour des cas edge : import, reset manuel, tests).
     */
    setSession: (session: DailySession | null) => void;
}

export type SessionStore = SessionState & SessionActions;

// ─── Persistance helpers (localStorage + cloud) ───────────────────────

function writeSessionToLocal(session: DailySession | null): void {
    if (typeof window === 'undefined') return;
    try {
        if (session) {
            window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        } else {
            window.localStorage.removeItem(SESSION_KEY);
        }
    } catch {
        // localStorage indisponible (private mode, quota) — on ignore
    }
}

function readSessionFromLocal(): DailySession | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(SESSION_KEY);
        return raw ? (JSON.parse(raw) as DailySession) : null;
    } catch {
        return null;
    }
}

function isCurrentDaySession(
    session: DailySession | null,
    today: string,
): session is DailySession {
    return Boolean(session && session.date === today);
}

function writeHistoryToLocal(history: SessionHistoryEntry[]): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
        // ignore
    }
}

function persistSession(session: DailySession | null): void {
    writeSessionToLocal(session);
    if (session) {
        saveDailySession(session).catch((err) => {
            console.warn('[sessionStore] saveDailySession failed', err);
        });
    } else {
        clearDailySession().catch((err) => {
            console.warn('[sessionStore] clearDailySession failed', err);
        });
    }
}

// ─── Store ────────────────────────────────────────────────────────────

export const useSessionStore = create<SessionStore>((set, get) => ({
    session: null,
    history: [],
    isHydrated: false,

    // ── hydrate ───────────────────────────────────────────────────────
    hydrate: async (today) => {
        let nextSession: DailySession | null = null;

        // Instant local load
        const local = readSessionFromLocal();
        if (isCurrentDaySession(local, today)) {
            nextSession = local;
            set({ session: local });
        }

        // Cloud override (authoritative)
        try {
            const cloudSession = await loadDailySession();
            if (isCurrentDaySession(cloudSession, today)) {
                nextSession = cloudSession;
                set({ session: cloudSession });
                writeSessionToLocal(cloudSession);
            }
        } catch (err) {
            console.warn('[sessionStore] loadDailySession failed', err);
        }

        // Load history (no date filter — history spans many days)
        try {
            const history = await loadSessionHistory();
            set({ history });
        } catch (err) {
            console.warn('[sessionStore] loadSessionHistory failed', err);
        }

        set({ session: nextSession, isHydrated: true });
    },

    // ── generateSession ───────────────────────────────────────────────
    generateSession: (strategy, subjects, load, today, now) => {
        const t = now ?? Date.now();
        const tasks = generateDailyTasks(strategy, subjects, load, { now: t });
        const session: DailySession = {
            date: today,
            dayLoad: load,
            tasks,
            generatedAt: t,
        };
        set({ session });
        persistSession(session);
    },

    // ── startTask ─────────────────────────────────────────────────────
    startTask: (taskId, now) => {
        const t = now ?? Date.now();
        const current = get().session;
        if (!current) return;
        const next: DailySession = {
            ...current,
            tasks: current.tasks.map((task) =>
                task.id === taskId
                    ? { ...task, status: 'in-progress' as const, startedAt: t }
                    : task,
            ),
        };
        set({ session: next });
        persistSession(next);
    },

    // ── completeTask ──────────────────────────────────────────────────
    completeTask: (taskId, rating, now) => {
        const t = now ?? Date.now();
        const current = get().session;
        if (!current) return null;
        const task = current.tasks.find((x) => x.id === taskId);
        if (!task) return null;

        const { taskUpdate, progressUpdate } = applyTaskCompletion(task, rating, t);
        const nextSession: DailySession = {
            ...current,
            tasks: current.tasks.map((x) =>
                x.id === taskId ? { ...x, ...taskUpdate } : x,
            ),
        };
        set({ session: nextSession });
        persistSession(nextSession);

        // History: optimistic append locally + cloud persistence
        const historyEntry: SessionHistoryEntry = {
            date: toLocalISOString(new Date(t)),
            taskType: task.taskType,
            reason: task.reason,
            subjectTitle: task.subjectTitle,
            chapterTitle: task.chapterTitle,
            durationMs: task.startedAt ? t - task.startedAt : 0,
            difficultyRating: rating,
        };
        const priorHistory = get().history;
        const optimisticHistory = [...priorHistory, historyEntry].slice(-SESSION_HISTORY_MAX);
        set({ history: optimisticHistory });
        writeHistoryToLocal(optimisticHistory);
        appendSessionHistory(priorHistory, historyEntry)
            .catch((err) => {
                console.warn('[sessionStore] appendSessionHistory failed', err);
            });

        return {
            subjectId: task.subjectId,
            chapterId: task.chapterId,
            progressUpdate,
        };
    },

    // ── skipTask ──────────────────────────────────────────────────────
    skipTask: (taskId) => {
        const current = get().session;
        if (!current) return;
        const next: DailySession = {
            ...current,
            tasks: current.tasks.map((task) =>
                task.id === taskId
                    ? { ...task, status: 'skipped' as const }
                    : task,
            ),
        };
        set({ session: next });
        persistSession(next);
    },

    // ── clearSession ──────────────────────────────────────────────────
    clearSession: () => {
        set({ session: null });
        persistSession(null);
    },

    // ── setSession (raw setter for edge cases) ─────────────────────────
    setSession: (session) => {
        set({ session });
        persistSession(session);
    },
}));
