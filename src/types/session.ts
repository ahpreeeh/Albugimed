// ─── Session Engine Types ────────────────────────────────────────────
// Defines the daily session model: task queue, statuses, timing.

import type { DayLoad } from './strategy';

/** What kind of work a session task represents */
export type SessionTaskType = 'cours' | 'annale';

/** The annale difficulty level */
export type AnnaleLevel = 1 | 2 | 3 | 4;

/** Why the engine picked this chapter */
export type SessionReason = 'nouveau' | 'entretien' | 'revision';

/** Execution status of a single task */
export type TaskStatus = 'pending' | 'in-progress' | 'done' | 'skipped';

/** Color code the user rates difficulty with after completing a task */
export type DifficultyRating = 'blue' | 'green' | 'orange' | 'red';

/** A single atomic unit of work in the daily session */
export interface SessionTask {
    id: string;
    /** Chapter reference */
    subjectId: string;
    subjectTitle: string;
    chapterId: string;
    chapterTitle: string;
    /** What to do */
    taskType: SessionTaskType;
    annaleLevel?: AnnaleLevel;
    /** Why this chapter was selected */
    reason: SessionReason;
    /** Execution state */
    status: TaskStatus;
    /** Timing (ms timestamps) */
    startedAt: number | null;
    completedAt: number | null;
    /** User feedback after completion */
    difficultyRating: DifficultyRating | null;
}

/** The complete daily session state */
export interface DailySession {
    date: string;                   // ISO date YYYY-MM-DD
    dayLoad: DayLoad;
    tasks: SessionTask[];
    generatedAt: number;            // timestamp ms
}

/** Returns a human-readable label for a reason */
export function reasonLabel(reason: SessionReason): string {
    switch (reason) {
        case 'nouveau': return 'Nouveau chapitre';
        case 'entretien': return 'Entretien';
        case 'revision': return 'Révision';
    }
}

/** Returns a human-readable label for a task type */
export function taskTypeLabel(type: SessionTaskType, level?: AnnaleLevel): string {
    if (type === 'cours') return 'Cours';
    return `Annale Niv. ${level ?? 1}`;
}

/** Returns the CSS badge class for a reason */
export function reasonBadgeClass(reason: SessionReason): string {
    switch (reason) {
        case 'nouveau': return 'app-badge-accent';
        case 'entretien': return 'app-badge-qcm';
        case 'revision': return 'app-badge-revision';
    }
}

/** Returns the CSS color for a difficulty rating */
export function difficultyColor(rating: DifficultyRating): string {
    switch (rating) {
        case 'blue': return 'var(--color-accent)';
        case 'green': return 'var(--color-success)';
        case 'orange': return 'var(--color-priority)';
        case 'red': return 'var(--color-danger)';
    }
}
