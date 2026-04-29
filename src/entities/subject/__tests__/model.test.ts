import { describe, it, expect } from 'vitest';
import { createDefaultProgress, computeProgress } from '../model';
import type { Chapter } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────

function makeChapter(
    id: string,
    progressOverrides: Partial<Chapter['progress']> = {},
): Chapter {
    return {
        id,
        title: `Chapitre ${id}`,
        status: { t1: false, annales: false, t2: false },
        progress: { ...createDefaultProgress(), ...progressOverrides },
    };
}

// ─── createDefaultProgress ───────────────────────────────────────────

describe('createDefaultProgress', () => {
    it('retourne une progression vierge (4 booléens à false, dates null, pas de revue)', () => {
        const progress = createDefaultProgress();

        expect(progress).toEqual({
            courseStarted: false,
            level1Done: false,
            reactivationDone: false,
            advancedDone: false,
            firstSeenDate: null,
            lastWorkedDate: null,
            lastTrainingDate: null,
            lastReviewDifficulty: undefined,
            nextReviewDate: null,
        });
    });

    it('retourne une nouvelle référence à chaque appel (pas de mutation partagée)', () => {
        const a = createDefaultProgress();
        const b = createDefaultProgress();

        expect(a).not.toBe(b);
        a.courseStarted = true;
        expect(b.courseStarted).toBe(false);
    });
});

// ─── computeProgress ─────────────────────────────────────────────────

describe('computeProgress', () => {
    it('retourne des compteurs à 0 pour une liste vide', () => {
        expect(computeProgress([])).toEqual({
            courseStartedCount: 0,
            level1Count: 0,
            fullCount: 0,
        });
    });

    it('compte chaque booléen indépendamment (chapitre partiellement avancé)', () => {
        const chapters = [
            makeChapter('a', { courseStarted: true }),
            makeChapter('b', { courseStarted: true, level1Done: true }),
            makeChapter('c', {}), // vierge
        ];

        expect(computeProgress(chapters)).toEqual({
            courseStartedCount: 2,
            level1Count: 1,
            fullCount: 0,
        });
    });

    it('incrémente fullCount uniquement quand les 4 booléens sont vrais', () => {
        const chapters = [
            // Full
            makeChapter('a', {
                courseStarted: true,
                level1Done: true,
                reactivationDone: true,
                advancedDone: true,
            }),
            // Manque advancedDone → pas full
            makeChapter('b', {
                courseStarted: true,
                level1Done: true,
                reactivationDone: true,
            }),
            // Manque courseStarted → pas full même si les 3 autres le sont
            makeChapter('c', {
                level1Done: true,
                reactivationDone: true,
                advancedDone: true,
            }),
        ];

        const result = computeProgress(chapters);
        expect(result.fullCount).toBe(1);
        expect(result.courseStartedCount).toBe(2);
        expect(result.level1Count).toBe(3);
    });

    it('traite chaque chapitre indépendamment (pas de mutation d\'état)', () => {
        const chapter = makeChapter('a', { courseStarted: true, level1Done: true });
        const first = computeProgress([chapter]);
        const second = computeProgress([chapter]);

        expect(first).toEqual(second);
    });
});
