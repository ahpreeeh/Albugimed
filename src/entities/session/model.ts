// ─── Session Engine — pure logic ──────────────────────────────────────
// Fonctions pures extraites de `src/context/SessionEngineContext.tsx`
// (step 3.3, Phase 3). Aucun import React, aucun accès DOM/storage —
// 100 % testable. `now` et `makeId` sont injectables pour le déterminisme
// des tests unitaires.
//
// Règle : ce module ne lit JAMAIS un autre store. Toutes les données
// (strategy, subjects, load) arrivent en paramètres, composées par le
// hook d'orchestration appelant.

import type { Subject, Chapter, ChapterProgress } from '@/entities/subject/types';
import type { ActiveStrategy, DayLoad } from '@/entities/strategy/types';
import type {
    SessionTask,
    SessionReason,
    DifficultyRating,
    AnnaleLevel,
} from '@/entities/session/types';
import { toLocalISOString } from '@/shared/lib/dates';

// ─── Injection points ────────────────────────────────────────────────

export interface GenerateOptions {
    /** Injectable timestamp (ms). Defaults to `Date.now()`. */
    now?: number;
    /** Injectable id generator. Defaults to `crypto.randomUUID()`. */
    makeId?: () => string;
}

function defaultMakeId(): string {
    return crypto.randomUUID();
}

// ─── Chapter categorisation ──────────────────────────────────────────

/**
 * Categorise a chapter based on its progress into a SessionReason.
 *   - no course + no level1  → 'nouveau'
 *   - course done + advanced not done  → 'entretien'
 *   - all others  → 'revision'
 */
export function categoriseChapter(progress: ChapterProgress): SessionReason {
    if (!progress.courseStarted && !progress.level1Done) {
        return 'nouveau';
    }
    if (progress.courseStarted && !progress.advancedDone) {
        return 'entretien';
    }
    return 'revision';
}

/**
 * Score a chapter for scheduling priority.
 * Lower score = earlier in the queue.
 *
 * Contributions:
 *   - reason  : nouveau -100, entretien -50, revision 0
 *   - last difficulty  : red -40, orange -25, green -10, blue 0
 *   - days since last worked  : min(daysSince * 2, 60), or -80 if never
 */
export function chapterPriority(
    ch: Chapter,
    reason: SessionReason,
    now: number = Date.now(),
): number {
    let score = 0;

    if (reason === 'nouveau') score -= 100;
    if (reason === 'entretien') score -= 50;

    const diff = ch.progress.lastReviewDifficulty;
    if (diff === 'red') score -= 40;
    else if (diff === 'orange') score -= 25;
    else if (diff === 'green') score -= 10;
    // blue  → no bonus (easiest, lowest priority)

    if (ch.progress.lastWorkedDate) {
        const daysSince = Math.floor(
            (now - new Date(ch.progress.lastWorkedDate).getTime()) / 86400000
        );
        score -= Math.min(daysSince * 2, 60);
    } else {
        score -= 80; // never worked
    }

    return score;
}

/**
 * Determine the annale level to schedule for a chapter based on its progress.
 * Progresses 1 → 2 → 3 → 4 as milestones are completed.
 */
export function getAnnaleLevel(progress: ChapterProgress): AnnaleLevel {
    if (!progress.level1Done) return 1;
    if (!progress.reactivationDone) return 2;
    if (!progress.advancedDone) return 3;
    return 4;
}

// ─── Task builder ────────────────────────────────────────────────────

/**
 * Build the SessionTask(s) for a single chapter based on its reason:
 *   - 'nouveau'   → cours + annale level 1  (2 tasks)
 *   - 'entretien' → annale at `getAnnaleLevel(progress)`  (1 task)
 *   - 'revision'  → annale at `getAnnaleLevel(progress)`  (1 task)
 */
export function buildChapterTasks(
    subject: Subject,
    chapter: Chapter,
    reason: SessionReason,
    makeId: () => string = defaultMakeId,
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
        tasks.push({ ...base, id: makeId(), taskType: 'cours' });
        tasks.push({ ...base, id: makeId(), taskType: 'annale', annaleLevel: 1 });
    } else if (reason === 'entretien') {
        const level = getAnnaleLevel(chapter.progress);
        tasks.push({ ...base, id: makeId(), taskType: 'annale', annaleLevel: level });
    } else {
        // 'revision'
        const level = getAnnaleLevel(chapter.progress);
        tasks.push({ ...base, id: makeId(), taskType: 'annale', annaleLevel: level });
    }

    return tasks;
}

// ─── Target subject selection ────────────────────────────────────────

/**
 * Filter the subjects list to those targeted by the active strategy.
 */
export function getTargetSubjects(strategy: ActiveStrategy, subjects: Subject[]): Subject[] {
    switch (strategy.mode) {
        case 'preparation':
            return subjects.filter(s => strategy.preparationSubjectIds.includes(s.id));
        case 'rush':
            return subjects.filter(s => (strategy.rushSubjectIds ?? []).includes(s.id));
        case 'vacances':
            return subjects.filter(s => (strategy.vacancesSubjectIds ?? []).includes(s.id));
        default:
            return [];
    }
}

// ─── Daily session generation ────────────────────────────────────────

/**
 * Generate a full daily session task list based on strategy + day load.
 *
 * Day load quotas:
 *   plancher  : 1 nouveau (+ 1 entretien if any available)
 *   standard  : 1 nouveau + 1 entretien + 1 révision (prefers easy: blue/green/unknown)
 *   plafond   : 1-3 nouveaux + 1 entretien + 1 révision (prefers hard: red/orange)
 *
 * Fallback : if zero nouveaux were picked and the task list is empty,
 * append up to 2 entries from entretiens+revisions with their natural reason.
 */
export function generateDailyTasks(
    strategy: ActiveStrategy,
    subjects: Subject[],
    load: DayLoad,
    opts: GenerateOptions = {},
): SessionTask[] {
    const now = opts.now ?? Date.now();
    const makeId = opts.makeId ?? defaultMakeId;

    const targetSubjects = getTargetSubjects(strategy, subjects);
    if (targetSubjects.length === 0) return [];

    const pool: {
        subject: Subject;
        chapter: Chapter;
        reason: SessionReason;
        priority: number;
    }[] = [];

    for (const subject of targetSubjects) {
        for (const chapter of subject.chapters) {
            const reason = categoriseChapter(chapter.progress);
            const priority = chapterPriority(chapter, reason, now);
            pool.push({ subject, chapter, reason, priority });
        }
    }

    const nouveaux = pool
        .filter(p => p.reason === 'nouveau')
        .sort((a, b) => a.priority - b.priority);
    const entretiens = pool
        .filter(p => p.reason === 'entretien')
        .sort((a, b) => a.priority - b.priority);
    const revisions = pool
        .filter(p => p.reason === 'revision')
        .sort((a, b) => a.priority - b.priority);

    let newQuota: number;
    let entretienQuota: number;
    let revisionQuota: number;

    switch (load) {
        case 'plancher':
            newQuota = 1;
            entretienQuota = 0;
            revisionQuota = 0;
            if (entretiens.length > 0) entretienQuota = 1;
            break;
        case 'standard':
            newQuota = 1;
            entretienQuota = 1;
            revisionQuota = 1;
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
        tasks.push(...buildChapterTasks(p.subject, p.chapter, 'nouveau', makeId));
    }

    // 2. Pick entretiens
    const pickedEntretien = entretiens.slice(0, entretienQuota);
    for (const p of pickedEntretien) {
        tasks.push(...buildChapterTasks(p.subject, p.chapter, 'entretien', makeId));
    }

    // 3. Pick revisions (order reshaped by difficulty for standard / plafond)
    let revisionPool = revisions;
    if (load === 'standard') {
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
        tasks.push(...buildChapterTasks(p.subject, p.chapter, 'revision', makeId));
    }

    // Fallback: no nouveau was picked and nothing else was either
    if (pickedNew.length === 0 && tasks.length === 0) {
        const fallback = [...entretiens, ...revisions].slice(0, 2);
        for (const p of fallback) {
            tasks.push(...buildChapterTasks(p.subject, p.chapter, p.reason, makeId));
        }
    }

    return tasks;
}

// ─── Task lifecycle helpers ──────────────────────────────────────────
// Previously inlined in SessionEngineContext useMemo/useCallback blocks.

/**
 * Find the first task that is pending or in-progress.
 * Returns `-1` if none found.
 */
export function findCurrentTaskIndex(tasks: readonly SessionTask[]): number {
    return tasks.findIndex(t => t.status === 'pending' || t.status === 'in-progress');
}

/**
 * Whether all tasks are finished (done or skipped).
 * Returns `false` on an empty list (no tasks = not a "done" session).
 */
export function isAllDone(tasks: readonly SessionTask[]): boolean {
    if (tasks.length === 0) return false;
    return tasks.every(t => t.status === 'done' || t.status === 'skipped');
}

/**
 * Sum the durations of all completed tasks (done with start + complete timestamps).
 */
export function computeTotalElapsedMs(tasks: readonly SessionTask[]): number {
    return tasks.reduce((sum, t) => {
        if (t.status === 'done' && t.startedAt && t.completedAt) {
            return sum + (t.completedAt - t.startedAt);
        }
        return sum;
    }, 0);
}

// ─── Task completion (derive updates) ─────────────────────────────────

export interface TaskCompletionResult {
    /** Patch to apply on the SessionTask (status + completedAt + rating). */
    taskUpdate: Partial<SessionTask>;
    /** Patch to apply on ChapterProgress (milestones + dates + difficulty). */
    progressUpdate: Partial<ChapterProgress>;
}

/**
 * Derive the task + chapter-progress updates produced by a completion event.
 * Pure : does NOT mutate the task nor persist anything.
 *
 * Mapping (preserved from SessionEngineContext.completeCurrentTask, L401-451):
 *   - Every completion sets  lastWorkedDate + lastReviewDifficulty
 *   - cours               → courseStarted = true
 *   - annale level 1      → level1Done = true + lastTrainingDate
 *   - annale level 2      → reactivationDone = true + lastTrainingDate
 *   - annale level ≥ 3    → advancedDone = true + lastTrainingDate
 */
export function applyTaskCompletion(
    task: SessionTask,
    rating: DifficultyRating,
    now: number = Date.now(),
): TaskCompletionResult {
    const date = toLocalISOString(new Date(now));

    const taskUpdate: Partial<SessionTask> = {
        status: 'done',
        completedAt: now,
        difficultyRating: rating,
    };

    const progressUpdate: Partial<ChapterProgress> = {
        lastWorkedDate: date,
        lastReviewDifficulty: rating,
    };

    if (task.taskType === 'cours') {
        progressUpdate.courseStarted = true;
    } else if (task.taskType === 'annale') {
        if (task.annaleLevel === 1) progressUpdate.level1Done = true;
        if (task.annaleLevel === 2) progressUpdate.reactivationDone = true;
        if (task.annaleLevel && task.annaleLevel >= 3) progressUpdate.advancedDone = true;
        progressUpdate.lastTrainingDate = date;
    }

    return { taskUpdate, progressUpdate };
}
