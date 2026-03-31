"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useSubjects } from '@/context/SubjectContext';
import { useStrategy } from '@/context/StrategyContext';
import type { Subject, Chapter, ChapterProgress } from '@/context/SubjectContext';
import type { ActiveStrategy } from '@/types/strategy';
import type { DayLoad } from '@/types/strategy';
import type {
    DailySession, SessionTask, SessionReason, DifficultyRating,
} from '@/types/session';
import { toLocalISOString } from '@/lib/utils';

// ─── Storage ─────────────────────────────────────────────────────────
const SESSION_STORAGE_KEY = 'med-pilot-daily-session';
const HISTORY_KEY = 'med-pilot-session-history';

// ─── Context shape ───────────────────────────────────────────────────
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

// ─── Task generation helpers ─────────────────────────────────────────

function makeTaskId(): string {
    return crypto.randomUUID();
}

/**
 * Categorise a chapter based on its progress into a SessionReason.
 */
function categoriseChapter(progress: ChapterProgress): SessionReason {
    if (!progress.courseStarted && !progress.level1Done) {
        return 'nouveau';
    }
    // If course started but advanced not done → entretien
    if (progress.courseStarted && !progress.advancedDone) {
        return 'entretien';
    }
    // Else → revision
    return 'revision';
}

/**
 * Score a chapter for scheduling priority.
 * Lower score = earlier in the queue.
 */
function chapterPriority(ch: Chapter, reason: SessionReason): number {
    let score = 0;
    // Nouveaux chapitres go first
    if (reason === 'nouveau') score -= 100;
    if (reason === 'entretien') score -= 50;

    // Chapters with worse difficulty rating get higher priority for revision
    const diff = ch.progress.lastReviewDifficulty;
    if (diff === 'red') score -= 40;
    else if (diff === 'orange') score -= 25;
    else if (diff === 'green') score -= 10;
    // blue = easy, lowest priority

    // Chapters not worked on recently get higher priority
    if (ch.progress.lastWorkedDate) {
        const daysSince = Math.floor(
            (Date.now() - new Date(ch.progress.lastWorkedDate).getTime()) / 86400000
        );
        score -= Math.min(daysSince * 2, 60);
    } else {
        score -= 80; // never touched
    }

    return score;
}

/**
 * Determine annale level for a chapter based on its progress.
 */
function getAnnaleLevel(progress: ChapterProgress): 1 | 2 | 3 | 4 {
    if (!progress.level1Done) return 1;
    if (!progress.reactivationDone) return 2;
    if (!progress.advancedDone) return 3;
    return 4;
}

/**
 * Build tasks for a single chapter: cours + annale pair (for preparation),
 * or just annale (for entretien/revision).
 */
function buildChapterTasks(
    subject: Subject,
    chapter: Chapter,
    reason: SessionReason,
): SessionTask[] {
    const tasks: SessionTask[] = [];
    const base = {
        subjectId: subject.id,
        subjectTitle: subject.title,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        reason,
        status: 'pending' as const,
        startedAt: null,
        completedAt: null,
        difficultyRating: null,
    };

    if (reason === 'nouveau') {
        // Cours + annale level 1
        tasks.push({ ...base, id: makeTaskId(), taskType: 'cours' });
        tasks.push({ ...base, id: makeTaskId(), taskType: 'annale', annaleLevel: 1 });
    } else if (reason === 'entretien') {
        // Annale at the appropriate level
        const level = getAnnaleLevel(chapter.progress);
        tasks.push({ ...base, id: makeTaskId(), taskType: 'annale', annaleLevel: level });
    } else {
        // Revision — annale at current level
        const level = getAnnaleLevel(chapter.progress);
        tasks.push({ ...base, id: makeTaskId(), taskType: 'annale', annaleLevel: level });
    }

    return tasks;
}

/**
 * Generate a full daily session based on strategy + day load.
 *
 * Day load quotas:
 *   plancher:  1 nouveau
 *   standard:  1 nouveau + 1 entretien + 1 révision (easy)
 *   plafond:   1-3 nouveaux + 1 entretien + 1 révision (hard)
 */
function generateDailyTasks(
    strategy: ActiveStrategy,
    subjects: Subject[],
    load: DayLoad,
): SessionTask[] {
    // Determine which subjects to work with
    const targetSubjects = getTargetSubjects(strategy, subjects);
    if (targetSubjects.length === 0) return [];

    // Collect all chapters and categorise them
    const pool: { subject: Subject; chapter: Chapter; reason: SessionReason; priority: number }[] = [];

    for (const subject of targetSubjects) {
        for (const chapter of subject.chapters) {
            const reason = categoriseChapter(chapter.progress);
            const priority = chapterPriority(chapter, reason);
            pool.push({ subject, chapter, reason, priority });
        }
    }

    // Separate by reason
    const nouveaux = pool.filter(p => p.reason === 'nouveau').sort((a, b) => a.priority - b.priority);
    const entretiens = pool.filter(p => p.reason === 'entretien').sort((a, b) => a.priority - b.priority);
    const revisions = pool.filter(p => p.reason === 'revision').sort((a, b) => a.priority - b.priority);

    // Define quotas
    let newQuota: number, entretienQuota: number, revisionQuota: number;

    switch (load) {
        case 'plancher':
            newQuota = 1; entretienQuota = 0; revisionQuota = 0;
            // If needed, add 1 entretien if there are chapters to maintain
            if (entretiens.length > 0) entretienQuota = 1;
            break;
        case 'standard':
            newQuota = 1; entretienQuota = 1; revisionQuota = 1;
            break;
        case 'plafond':
            newQuota = Math.min(3, nouveaux.length || 1);
            entretienQuota = 1;
            revisionQuota = 1;
            break;
    }

    const tasks: SessionTask[] = [];

    // 1. Pick nouveaux
    const pickedNew = nouveaux.slice(0, newQuota);
    for (const p of pickedNew) {
        tasks.push(...buildChapterTasks(p.subject, p.chapter, 'nouveau'));
    }

    // 2. Pick entretiens
    const pickedEntretien = entretiens.slice(0, entretienQuota);
    for (const p of pickedEntretien) {
        tasks.push(...buildChapterTasks(p.subject, p.chapter, 'entretien'));
    }

    // 3. Pick revisions
    // For plafond: prefer hard chapters (red/orange)
    let revisionPool = revisions;
    if (load === 'standard') {
        // prefer easy — blue/green
        revisionPool = [
            ...revisions.filter(r =>
                r.chapter.progress.lastReviewDifficulty === 'blue' ||
                r.chapter.progress.lastReviewDifficulty === 'green' ||
                !r.chapter.progress.lastReviewDifficulty
            ),
            ...revisions.filter(r =>
                r.chapter.progress.lastReviewDifficulty === 'orange' ||
                r.chapter.progress.lastReviewDifficulty === 'red'
            ),
        ];
    } else if (load === 'plafond') {
        // prefer hard — red/orange first
        revisionPool = [
            ...revisions.filter(r =>
                r.chapter.progress.lastReviewDifficulty === 'red' ||
                r.chapter.progress.lastReviewDifficulty === 'orange'
            ),
            ...revisions.filter(r =>
                r.chapter.progress.lastReviewDifficulty === 'blue' ||
                r.chapter.progress.lastReviewDifficulty === 'green' ||
                !r.chapter.progress.lastReviewDifficulty
            ),
        ];
    }
    const pickedRevision = revisionPool.slice(0, revisionQuota);
    for (const p of pickedRevision) {
        tasks.push(...buildChapterTasks(p.subject, p.chapter, 'revision'));
    }

    // Fallback: if no new chapters, fill with extra revision/entretien
    if (pickedNew.length === 0 && tasks.length === 0) {
        const fallback = [...entretiens, ...revisions].slice(0, 2);
        for (const p of fallback) {
            tasks.push(...buildChapterTasks(p.subject, p.chapter, p.reason));
        }
    }

    return tasks;
}

function getTargetSubjects(strategy: ActiveStrategy, subjects: Subject[]): Subject[] {
    switch (strategy.mode) {
        case 'preparation':
            return subjects.filter(s => strategy.preparationSubjectIds.includes(s.id));
        case 'rush':
            return subjects.filter(s => s.id === strategy.rushSubjectId);
        case 'vacances':
            return subjects.filter(s => s.id === strategy.vacancesSubjectId);
        default:
            return [];
    }
}

// ─── Provider ────────────────────────────────────────────────────────
export const SessionEngineProvider = ({ children }: { children: ReactNode }) => {
    const { subjects, updateChapterProgress } = useSubjects();
    const { strategy } = useStrategy();
    const [session, setSession] = useState<DailySession | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    const today = toLocalISOString(new Date());

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const raw = localStorage.getItem(SESSION_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw) as DailySession;
                // Only restore if it's today's session
                if (parsed.date === today) {
                    setSession(parsed);
                }
            }
        } catch (e) {
            console.error('[SessionEngine] Failed to parse stored session', e);
        }
        setIsLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Persist session
    useEffect(() => {
        if (!isLoaded) return;
        if (session) {
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
        }
    }, [session, isLoaded]);

    // ── Generate ─────────────────────────────────────────────────────
    const generateSession = useCallback((load: DayLoad) => {
        if (!strategy) return;

        const tasks = generateDailyTasks(strategy, subjects, load);
        const newSession: DailySession = {
            date: today,
            dayLoad: load,
            tasks,
            generatedAt: Date.now(),
        };
        setSession(newSession);
    }, [strategy, subjects, today]);

    // ── Task navigation ──────────────────────────────────────────────
    const currentTaskIndex = useMemo(() => {
        if (!session) return -1;
        return session.tasks.findIndex(t => t.status === 'pending' || t.status === 'in-progress');
    }, [session]);

    const currentTask = useMemo(() => {
        if (!session || currentTaskIndex < 0) return null;
        return session.tasks[currentTaskIndex];
    }, [session, currentTaskIndex]);

    const allDone = useMemo(() => {
        if (!session || session.tasks.length === 0) return false;
        return session.tasks.every(t => t.status === 'done' || t.status === 'skipped');
    }, [session]);

    // ── Actions ──────────────────────────────────────────────────────
    const updateTask = useCallback((taskId: string, updates: Partial<SessionTask>) => {
        setSession(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                tasks: prev.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t),
            };
        });
    }, []);

    const startCurrentTask = useCallback(() => {
        if (!currentTask) return;
        updateTask(currentTask.id, { status: 'in-progress', startedAt: Date.now() });
    }, [currentTask, updateTask]);

    const completeCurrentTask = useCallback((rating: DifficultyRating) => {
        if (!currentTask) return;
        const now = Date.now();
        updateTask(currentTask.id, {
            status: 'done',
            completedAt: now,
            difficultyRating: rating,
        });

        // Persist progress back to SubjectContext
        const progressUpdates: Partial<ChapterProgress> = {
            lastWorkedDate: toLocalISOString(new Date()),
            lastReviewDifficulty: rating,
        };

        if (currentTask.taskType === 'cours') {
            progressUpdates.courseStarted = true;
        } else if (currentTask.taskType === 'annale') {
            if (currentTask.annaleLevel === 1) progressUpdates.level1Done = true;
            if (currentTask.annaleLevel === 2) progressUpdates.reactivationDone = true;
            if (currentTask.annaleLevel && currentTask.annaleLevel >= 3) progressUpdates.advancedDone = true;
            progressUpdates.lastTrainingDate = toLocalISOString(new Date());
        }

        updateChapterProgress(currentTask.subjectId, currentTask.chapterId, progressUpdates);

        // Save to history
        try {
            const historyRaw = localStorage.getItem(HISTORY_KEY);
            const history = historyRaw ? JSON.parse(historyRaw) : [];
            history.push({
                date: toLocalISOString(new Date()),
                taskType: currentTask.taskType,
                reason: currentTask.reason,
                subjectTitle: currentTask.subjectTitle,
                chapterTitle: currentTask.chapterTitle,
                durationMs: currentTask.startedAt ? now - currentTask.startedAt : 0,
                difficultyRating: rating,
            });
            // Keep last 500 entries
            localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-500)));
        } catch { /* ignore */ }
    }, [currentTask, updateTask, updateChapterProgress]);

    const skipCurrentTask = useCallback(() => {
        if (!currentTask) return;
        updateTask(currentTask.id, { status: 'skipped' });
    }, [currentTask, updateTask]);

    // ── Elapsed time ─────────────────────────────────────────────────
    const totalElapsedMs = useMemo(() => {
        if (!session) return 0;
        return session.tasks.reduce((sum, t) => {
            if (t.status === 'done' && t.startedAt && t.completedAt) {
                return sum + (t.completedAt - t.startedAt);
            }
            return sum;
        }, 0);
    }, [session]);

    const hasSessionToday = useMemo(() => {
        return session?.date === today;
    }, [session, today]);

    return (
        <SessionEngineContext.Provider value={{
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
        }}>
            {children}
        </SessionEngineContext.Provider>
    );
};

// ─── Hook ────────────────────────────────────────────────────────────
export const useSessionEngine = () => {
    const ctx = useContext(SessionEngineContext);
    if (!ctx) throw new Error('useSessionEngine must be used within a SessionEngineProvider');
    return ctx;
};
