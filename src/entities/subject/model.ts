// ─── Subject entity — model (fonctions pures) ───────────────────────
// Extrait depuis `src/context/SubjectContext.tsx` L69-81 (step 2.2 Phase 2).
// Aucun import React, aucun accès DOM/storage — 100 % testable.

import type { Chapter, ChapterProgress } from './types';

/**
 * Retourne une progression « vierge » pour un nouveau chapitre.
 * Extrait du helper local de `SubjectContext.tsx` (créé lors de l'ajout
 * d'un subject ou d'un chapitre, cf. addSubject / addChapter / addChaptersBulk).
 */
export function createDefaultProgress(): ChapterProgress {
    return {
        courseStarted: false,
        level1Done: false,
        reactivationDone: false,
        advancedDone: false,
        firstSeenDate: null,
        lastWorkedDate: null,
        lastTrainingDate: null,
        lastReviewDifficulty: undefined,
        nextReviewDate: null,
    };
}

export interface ChapterCompletionCounts {
    /** Nombre de chapitres dont le cours a été commencé (`progress.courseStarted === true`). */
    courseStartedCount: number;
    /** Nombre de chapitres dont le niveau 1 est fait (`progress.level1Done === true`). */
    level1Count: number;
    /**
     * Nombre de chapitres « full » : cours commencé + L1 fait + réactivation faite + avancé fait.
     * Équivalent à une progression complète sur les 4 jalons booléens.
     */
    fullCount: number;
}

/**
 * Agrège la progression sur un tableau de chapitres — prévu pour les widgets
 * (stats cockpit, bars de progression, etc.). Ne touche pas aux dates, ne lit
 * que les 4 booléens de `ChapterProgress`.
 */
export function computeProgress(chapters: Chapter[]): ChapterCompletionCounts {
    let courseStartedCount = 0;
    let level1Count = 0;
    let fullCount = 0;

    for (const chapter of chapters) {
        const { courseStarted, level1Done, reactivationDone, advancedDone } = chapter.progress;

        if (courseStarted) courseStartedCount++;
        if (level1Done) level1Count++;
        if (courseStarted && level1Done && reactivationDone && advancedDone) {
            fullCount++;
        }
    }

    return { courseStartedCount, level1Count, fullCount };
}
