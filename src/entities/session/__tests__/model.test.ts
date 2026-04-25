// ─── Session model — unit tests ─────────────────────────────────────
// Couvrent les invariants métier du moteur de session extraits de
// SessionEngineContext.tsx (step 3.3, Phase 3). Ces tests capturent
// le comportement AVANT toute flip-switch Zustand — ils sont le filet
// de sécurité pour Lots O à R.

import { describe, it, expect } from 'vitest';
import {
    categoriseChapter,
    chapterPriority,
    getAnnaleLevel,
    buildChapterTasks,
    getTargetSubjects,
    generateDailyTasks,
    findCurrentTaskIndex,
    isAllDone,
    computeTotalElapsedMs,
    applyTaskCompletion,
} from '../model';
import { createDefaultProgress } from '@/entities/subject/model';
import type { Chapter, Subject, ChapterProgress } from '@/entities/subject/types';
import type { ActiveStrategy } from '@/entities/strategy/types';
import type { SessionTask, DifficultyRating } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────

const FIXED_NOW = new Date('2026-04-20T10:00:00Z').getTime();

function makeChapter(id: string, progress: Partial<ChapterProgress> = {}): Chapter {
    return {
        id,
        title: `Chap ${id}`,
        status: { t1: false, annales: false, t2: false },
        progress: { ...createDefaultProgress(), ...progress },
    };
}

function makeSubject(id: string, chapters: Chapter[] = []): Subject {
    return {
        id,
        title: `Subject ${id}`,
        iconName: 'heart',
        chapters,
    };
}

function makeStrategy(overrides: Partial<ActiveStrategy> = {}): ActiveStrategy {
    return {
        mode: 'preparation',
        preparationSubjectIds: [],
        preparationDeadline: null,
        rushSubjectIds: [],
        vacancesObjectif: null,
        vacancesSubjectIds: [],
        vacancesDuree: null,
        vacancesPerimetre: null,
        createdAt: 0,
        ...overrides,
    };
}

function makeTask(overrides: Partial<SessionTask> = {}): SessionTask {
    return {
        id: 'task-1',
        subjectId: 's1',
        subjectTitle: 'Cardio',
        chapterId: 'c1',
        chapterTitle: 'Chap 1',
        taskType: 'cours',
        reason: 'nouveau',
        status: 'pending',
        startedAt: null,
        completedAt: null,
        difficultyRating: null,
        ...overrides,
    };
}

let __counter = 0;
function deterministicMakeId(): string {
    __counter += 1;
    return `id-${__counter}`;
}
function resetIdCounter() { __counter = 0; }

// ─── categoriseChapter ───────────────────────────────────────────────

describe('categoriseChapter', () => {
    it('→ nouveau quand ni cours ni L1 n\'est fait', () => {
        expect(categoriseChapter(createDefaultProgress())).toBe('nouveau');
    });

    it('→ entretien quand cours commencé mais avancé non fait', () => {
        expect(categoriseChapter({ ...createDefaultProgress(), courseStarted: true }))
            .toBe('entretien');
    });

    it('→ revision quand cours commencé ET avancé fait', () => {
        expect(categoriseChapter({
            ...createDefaultProgress(),
            courseStarted: true,
            level1Done: true,
            reactivationDone: true,
            advancedDone: true,
        })).toBe('revision');
    });

    it('→ revision (edge) quand level1Done sans cours (incohérent mais géré)', () => {
        // level1Done = true → pas 'nouveau', courseStarted = false → pas 'entretien'
        // → fallback 'revision'
        expect(categoriseChapter({ ...createDefaultProgress(), level1Done: true }))
            .toBe('revision');
    });
});

// ─── chapterPriority ─────────────────────────────────────────────────

describe('chapterPriority', () => {
    it('nouveau < entretien < revision (à égalité de difficulty et date)', () => {
        const ch = makeChapter('x');
        const nouveau = chapterPriority(ch, 'nouveau', FIXED_NOW);
        const entretien = chapterPriority(ch, 'entretien', FIXED_NOW);
        const revision = chapterPriority(ch, 'revision', FIXED_NOW);

        expect(nouveau).toBeLessThan(entretien);
        expect(entretien).toBeLessThan(revision);
    });

    it('pénalise plus fort red que orange que green (à reason égale)', () => {
        const red = chapterPriority(
            makeChapter('a', { lastReviewDifficulty: 'red' }),
            'revision', FIXED_NOW,
        );
        const orange = chapterPriority(
            makeChapter('a', { lastReviewDifficulty: 'orange' }),
            'revision', FIXED_NOW,
        );
        const green = chapterPriority(
            makeChapter('a', { lastReviewDifficulty: 'green' }),
            'revision', FIXED_NOW,
        );
        const blue = chapterPriority(
            makeChapter('a', { lastReviewDifficulty: 'blue' }),
            'revision', FIXED_NOW,
        );

        expect(red).toBeLessThan(orange);
        expect(orange).toBeLessThan(green);
        expect(green).toBeLessThan(blue);
    });

    it('bonus "jamais travaillé" (-80) dépasse bonus "travaillé il y a longtemps" plafonné à -60', () => {
        const never = chapterPriority(makeChapter('a'), 'revision', FIXED_NOW);
        const longAgo = chapterPriority(
            makeChapter('a', { lastWorkedDate: '2025-01-01' }),
            'revision',
            FIXED_NOW,
        );
        expect(never).toBeLessThan(longAgo);
    });

    it('ancienneté contribue jusqu\'à -60 (plafond Math.min(daysSince*2, 60))', () => {
        // 100 jours → 200 capped à 60
        const tenDaysAgo = new Date(FIXED_NOW - 10 * 86400000).toISOString().slice(0, 10);
        const hundredDaysAgo = new Date(FIXED_NOW - 100 * 86400000).toISOString().slice(0, 10);

        const ten = chapterPriority(
            makeChapter('a', { lastWorkedDate: tenDaysAgo }),
            'revision',
            FIXED_NOW,
        );
        const hundred = chapterPriority(
            makeChapter('a', { lastWorkedDate: hundredDaysAgo }),
            'revision',
            FIXED_NOW,
        );

        // 10j: -20 ; 100j: -60 (plafonné)
        expect(ten).toBe(-20);
        expect(hundred).toBe(-60);
    });
});

// ─── getAnnaleLevel ──────────────────────────────────────────────────

describe('getAnnaleLevel', () => {
    it('retourne 1 quand L1 pas encore fait', () => {
        expect(getAnnaleLevel(createDefaultProgress())).toBe(1);
    });

    it('retourne 2 quand L1 fait mais réactivation pas faite', () => {
        expect(getAnnaleLevel({ ...createDefaultProgress(), level1Done: true }))
            .toBe(2);
    });

    it('retourne 3 quand L1+réactivation faits mais avancé pas fait', () => {
        expect(getAnnaleLevel({
            ...createDefaultProgress(),
            level1Done: true,
            reactivationDone: true,
        })).toBe(3);
    });

    it('retourne 4 quand tout est fait', () => {
        expect(getAnnaleLevel({
            ...createDefaultProgress(),
            level1Done: true,
            reactivationDone: true,
            advancedDone: true,
        })).toBe(4);
    });
});

// ─── buildChapterTasks ───────────────────────────────────────────────

describe('buildChapterTasks', () => {
    it('nouveau → 2 tâches (cours + annale L1)', () => {
        resetIdCounter();
        const subject = makeSubject('s1');
        const chapter = makeChapter('c1');
        const tasks = buildChapterTasks(subject, chapter, 'nouveau', deterministicMakeId);

        expect(tasks).toHaveLength(2);
        expect(tasks[0]).toMatchObject({ taskType: 'cours', reason: 'nouveau', status: 'pending' });
        expect(tasks[1]).toMatchObject({ taskType: 'annale', annaleLevel: 1, reason: 'nouveau' });
    });

    it('entretien → 1 annale au niveau calculé depuis le progress', () => {
        const subject = makeSubject('s1');
        const chapter = makeChapter('c1', { level1Done: true }); // → niveau 2
        const tasks = buildChapterTasks(subject, chapter, 'entretien', deterministicMakeId);

        expect(tasks).toHaveLength(1);
        expect(tasks[0]).toMatchObject({ taskType: 'annale', annaleLevel: 2, reason: 'entretien' });
    });

    it('revision → 1 annale au niveau calculé', () => {
        const subject = makeSubject('s1');
        const chapter = makeChapter('c1', {
            level1Done: true, reactivationDone: true, advancedDone: true,
        }); // → niveau 4
        const tasks = buildChapterTasks(subject, chapter, 'revision', deterministicMakeId);

        expect(tasks).toHaveLength(1);
        expect(tasks[0]).toMatchObject({ taskType: 'annale', annaleLevel: 4, reason: 'revision' });
    });

    it('hérite subjectId/subjectTitle/chapterId/chapterTitle du couple', () => {
        const subject = makeSubject('s42');
        subject.title = 'Cardio';
        const chapter = makeChapter('c99');
        chapter.title = 'Insuffisance cardiaque';

        const [task] = buildChapterTasks(subject, chapter, 'nouveau', deterministicMakeId);

        expect(task.subjectId).toBe('s42');
        expect(task.subjectTitle).toBe('Cardio');
        expect(task.chapterId).toBe('c99');
        expect(task.chapterTitle).toBe('Insuffisance cardiaque');
    });

    it('initialise startedAt/completedAt/difficultyRating à null', () => {
        const tasks = buildChapterTasks(
            makeSubject('s1'),
            makeChapter('c1'),
            'nouveau',
            deterministicMakeId,
        );
        for (const t of tasks) {
            expect(t.startedAt).toBeNull();
            expect(t.completedAt).toBeNull();
            expect(t.difficultyRating).toBeNull();
            expect(t.status).toBe('pending');
        }
    });
});

// ─── getTargetSubjects ───────────────────────────────────────────────

describe('getTargetSubjects', () => {
    const s1 = makeSubject('s1');
    const s2 = makeSubject('s2');
    const s3 = makeSubject('s3');
    const allSubjects = [s1, s2, s3];

    it('preparation → filtre sur preparationSubjectIds', () => {
        const strategy = makeStrategy({ mode: 'preparation', preparationSubjectIds: ['s1', 's3'] });
        expect(getTargetSubjects(strategy, allSubjects).map(s => s.id)).toEqual(['s1', 's3']);
    });

    it('rush → filtre sur rushSubjectIds', () => {
        const strategy = makeStrategy({ mode: 'rush', rushSubjectIds: ['s2'] });
        expect(getTargetSubjects(strategy, allSubjects).map(s => s.id)).toEqual(['s2']);
    });

    it('vacances → filtre sur vacancesSubjectIds', () => {
        const strategy = makeStrategy({ mode: 'vacances', vacancesSubjectIds: ['s1'] });
        expect(getTargetSubjects(strategy, allSubjects).map(s => s.id)).toEqual(['s1']);
    });

    it('retourne [] si aucun subjectId ne matche', () => {
        const strategy = makeStrategy({ mode: 'preparation', preparationSubjectIds: ['unknown'] });
        expect(getTargetSubjects(strategy, allSubjects)).toEqual([]);
    });
});

// ─── generateDailyTasks ──────────────────────────────────────────────

describe('generateDailyTasks', () => {
    it('retourne [] si aucun subject ciblé par la stratégie', () => {
        const strategy = makeStrategy({ preparationSubjectIds: [] });
        const result = generateDailyTasks(
            strategy,
            [makeSubject('s1')],
            'standard',
            { now: FIXED_NOW, makeId: deterministicMakeId },
        );
        expect(result).toEqual([]);
    });

    // ── plancher ──
    it('plancher : 1 nouveau, 0 entretien, 0 revision (si pas d\'entretien dispo)', () => {
        resetIdCounter();
        const subject = makeSubject('s1', [
            makeChapter('c1'), // nouveau
            makeChapter('c2'), // nouveau
        ]);
        const strategy = makeStrategy({ preparationSubjectIds: ['s1'] });

        const tasks = generateDailyTasks(strategy, [subject], 'plancher', {
            now: FIXED_NOW, makeId: deterministicMakeId,
        });
        // 1 nouveau → cours + annale L1 = 2 tâches
        expect(tasks).toHaveLength(2);
        expect(tasks.every(t => t.reason === 'nouveau')).toBe(true);
    });

    it('plancher : 1 nouveau + 1 entretien si des chapitres en maintenance existent', () => {
        resetIdCounter();
        const subject = makeSubject('s1', [
            makeChapter('c1'), // nouveau
            makeChapter('c2', { courseStarted: true }), // entretien
        ]);
        const strategy = makeStrategy({ preparationSubjectIds: ['s1'] });

        const tasks = generateDailyTasks(strategy, [subject], 'plancher', {
            now: FIXED_NOW, makeId: deterministicMakeId,
        });
        // 1 nouveau (2 tâches) + 1 entretien (1 tâche) = 3
        expect(tasks).toHaveLength(3);
        expect(tasks.filter(t => t.reason === 'nouveau')).toHaveLength(2);
        expect(tasks.filter(t => t.reason === 'entretien')).toHaveLength(1);
    });

    // ── standard ──
    it('standard : 1 nouveau + 1 entretien + 1 revision', () => {
        resetIdCounter();
        const subject = makeSubject('s1', [
            makeChapter('c1'), // nouveau
            makeChapter('c2', { courseStarted: true }), // entretien
            makeChapter('c3', {
                courseStarted: true, level1Done: true, reactivationDone: true, advancedDone: true,
            }), // revision
        ]);
        const strategy = makeStrategy({ preparationSubjectIds: ['s1'] });

        const tasks = generateDailyTasks(strategy, [subject], 'standard', {
            now: FIXED_NOW, makeId: deterministicMakeId,
        });
        // 1 nouveau (2 tâches) + 1 entretien (1) + 1 revision (1) = 4
        expect(tasks).toHaveLength(4);
        expect(tasks.filter(t => t.reason === 'nouveau')).toHaveLength(2);
        expect(tasks.filter(t => t.reason === 'entretien')).toHaveLength(1);
        expect(tasks.filter(t => t.reason === 'revision')).toHaveLength(1);
    });

    it('standard : préfère révisions blue/green plutôt que red/orange', () => {
        resetIdCounter();
        const revEasy = makeChapter('easy', {
            courseStarted: true, level1Done: true, reactivationDone: true, advancedDone: true,
            lastReviewDifficulty: 'green',
        });
        const revHard = makeChapter('hard', {
            courseStarted: true, level1Done: true, reactivationDone: true, advancedDone: true,
            lastReviewDifficulty: 'red',
        });
        const subject = makeSubject('s1', [
            makeChapter('new1'), // nouveau (requis pour quota)
            makeChapter('ent1', { courseStarted: true }), // entretien
            revEasy, revHard,
        ]);
        const strategy = makeStrategy({ preparationSubjectIds: ['s1'] });

        const tasks = generateDailyTasks(strategy, [subject], 'standard', {
            now: FIXED_NOW, makeId: deterministicMakeId,
        });
        const rev = tasks.find(t => t.reason === 'revision');
        expect(rev?.chapterId).toBe('easy');
    });

    // ── plafond ──
    it('plafond : jusqu\'à 3 nouveaux + 1 entretien + 1 revision (cours skippé en intensif)', () => {
        resetIdCounter();
        const subject = makeSubject('s1', [
            makeChapter('n1'), makeChapter('n2'), makeChapter('n3'), makeChapter('n4'),
            makeChapter('ent', { courseStarted: true }),
            makeChapter('rev', {
                courseStarted: true, level1Done: true, reactivationDone: true, advancedDone: true,
            }),
        ]);
        const strategy = makeStrategy({ preparationSubjectIds: ['s1'] });

        const tasks = generateDailyTasks(strategy, [subject], 'plafond', {
            now: FIXED_NOW, makeId: deterministicMakeId,
        });
        // 3 nouveaux × 1 (annale L1 seule, cours skippé) + 1 entretien + 1 revision = 5
        expect(tasks).toHaveLength(5);
        expect(tasks.filter(t => t.reason === 'nouveau')).toHaveLength(3);
        // Bug guard : aucune tâche cours en plafond, jamais
        expect(tasks.filter(t => t.taskType === 'cours')).toHaveLength(0);
    });

    it('plafond : aucune tâche `cours` même quand un chapitre `nouveau` est ciblé', () => {
        resetIdCounter();
        const subject = makeSubject('s1', [makeChapter('n1')]); // un seul nouveau, rien d'autre
        const strategy = makeStrategy({ preparationSubjectIds: ['s1'] });

        const tasks = generateDailyTasks(strategy, [subject], 'plafond', {
            now: FIXED_NOW, makeId: deterministicMakeId,
        });

        // 1 chapitre nouveau → seulement annale L1 (pas la paire cours+annale)
        expect(tasks).toHaveLength(1);
        expect(tasks[0]).toMatchObject({
            taskType: 'annale',
            annaleLevel: 1,
            reason: 'nouveau',
        });
    });

    it('standard et plancher conservent la tâche `cours` pour les nouveaux chapitres', () => {
        resetIdCounter();
        const subject = makeSubject('s1', [makeChapter('n1')]);
        const strategy = makeStrategy({ preparationSubjectIds: ['s1'] });

        const standardTasks = generateDailyTasks(strategy, [subject], 'standard', {
            now: FIXED_NOW, makeId: deterministicMakeId,
        });
        expect(standardTasks.filter(t => t.taskType === 'cours')).toHaveLength(1);

        const plancherTasks = generateDailyTasks(strategy, [subject], 'plancher', {
            now: FIXED_NOW, makeId: deterministicMakeId,
        });
        expect(plancherTasks.filter(t => t.taskType === 'cours')).toHaveLength(1);
    });

    it('plafond : préfère révisions red/orange plutôt que blue/green', () => {
        resetIdCounter();
        const revEasy = makeChapter('easy', {
            courseStarted: true, level1Done: true, reactivationDone: true, advancedDone: true,
            lastReviewDifficulty: 'green',
        });
        const revHard = makeChapter('hard', {
            courseStarted: true, level1Done: true, reactivationDone: true, advancedDone: true,
            lastReviewDifficulty: 'red',
        });
        const subject = makeSubject('s1', [
            makeChapter('new1'),
            makeChapter('ent1', { courseStarted: true }),
            revEasy, revHard,
        ]);
        const strategy = makeStrategy({ preparationSubjectIds: ['s1'] });

        const tasks = generateDailyTasks(strategy, [subject], 'plafond', {
            now: FIXED_NOW, makeId: deterministicMakeId,
        });
        const rev = tasks.find(t => t.reason === 'revision');
        expect(rev?.chapterId).toBe('hard');
    });

    // ── fallback ──
    it('fallback : si pas de "nouveau" dispo, pioche jusqu\'à 2 depuis entretien+revision', () => {
        resetIdCounter();
        // Subject sans aucun chapitre "nouveau"
        const subject = makeSubject('s1', [
            makeChapter('e1', { courseStarted: true }), // entretien
            makeChapter('r1', {
                courseStarted: true, level1Done: true, reactivationDone: true, advancedDone: true,
            }), // revision
        ]);
        const strategy = makeStrategy({ preparationSubjectIds: ['s1'] });

        // 'plancher' avec un entretien dispo → quota entretien = 1, pas de fallback needed
        // On force le fallback avec un chapitre ni entretien ni revision impossible ici,
        // donc on teste plutôt le cas où le pool est vide sauf entretien/revision en plancher
        const tasks = generateDailyTasks(strategy, [subject], 'plancher', {
            now: FIXED_NOW, makeId: deterministicMakeId,
        });
        // plancher : newQuota=1 mais pickedNew=[] (aucun), entretienQuota=1 (→e1), revisionQuota=0
        // tasks = 1 entretien. Pas de fallback déclenché car tasks.length > 0 avant la condition.
        expect(tasks.filter(t => t.reason === 'entretien')).toHaveLength(1);
    });

    it('fallback vraiment déclenché : plancher + pool entretiens vide → revision via fallback', () => {
        resetIdCounter();
        // Plancher : newQuota=1, entretienQuota=0 (aucun entretien), revisionQuota=0.
        // pickedNew=0, pickedEntretien=0, pickedRevision=0 → tasks vide → fallback.
        const subject = makeSubject('s1', [
            makeChapter('r1', {
                courseStarted: true, level1Done: true, reactivationDone: true, advancedDone: true,
            }),
        ]);
        const strategy = makeStrategy({ preparationSubjectIds: ['s1'] });

        const tasks = generateDailyTasks(strategy, [subject], 'plancher', {
            now: FIXED_NOW, makeId: deterministicMakeId,
        });
        expect(tasks).toHaveLength(1);
        expect(tasks[0].reason).toBe('revision');
    });
});

// ─── findCurrentTaskIndex ────────────────────────────────────────────

describe('findCurrentTaskIndex', () => {
    it('retourne 0 si la première tâche est pending', () => {
        expect(findCurrentTaskIndex([makeTask({ status: 'pending' })])).toBe(0);
    });

    it('saute les tâches done/skipped et renvoie la prochaine pending', () => {
        expect(findCurrentTaskIndex([
            makeTask({ id: 't1', status: 'done' }),
            makeTask({ id: 't2', status: 'skipped' }),
            makeTask({ id: 't3', status: 'pending' }),
        ])).toBe(2);
    });

    it('retourne -1 si toutes les tâches sont terminées', () => {
        expect(findCurrentTaskIndex([
            makeTask({ status: 'done' }),
            makeTask({ status: 'skipped' }),
        ])).toBe(-1);
    });

    it('considère in-progress comme "current"', () => {
        expect(findCurrentTaskIndex([
            makeTask({ status: 'done' }),
            makeTask({ status: 'in-progress' }),
        ])).toBe(1);
    });
});

// ─── isAllDone ────────────────────────────────────────────────────────

describe('isAllDone', () => {
    it('false sur tableau vide (pas de session = pas "done")', () => {
        expect(isAllDone([])).toBe(false);
    });

    it('true si toutes les tâches sont done ou skipped', () => {
        expect(isAllDone([
            makeTask({ status: 'done' }),
            makeTask({ status: 'skipped' }),
            makeTask({ status: 'done' }),
        ])).toBe(true);
    });

    it('false s\'il reste au moins une pending/in-progress', () => {
        expect(isAllDone([
            makeTask({ status: 'done' }),
            makeTask({ status: 'pending' }),
        ])).toBe(false);
    });
});

// ─── computeTotalElapsedMs ────────────────────────────────────────────

describe('computeTotalElapsedMs', () => {
    it('retourne 0 si aucune tâche done avec timestamps', () => {
        expect(computeTotalElapsedMs([])).toBe(0);
        expect(computeTotalElapsedMs([
            makeTask({ status: 'pending', startedAt: 100, completedAt: 200 }),
        ])).toBe(0);
    });

    it('ignore les tâches done sans startedAt ou sans completedAt', () => {
        expect(computeTotalElapsedMs([
            makeTask({ status: 'done', startedAt: null, completedAt: 200 }),
            makeTask({ status: 'done', startedAt: 100, completedAt: null }),
        ])).toBe(0);
    });

    it('somme les durations des tâches done avec timestamps', () => {
        expect(computeTotalElapsedMs([
            makeTask({ id: 't1', status: 'done', startedAt: 1000, completedAt: 3000 }), // 2000
            makeTask({ id: 't2', status: 'done', startedAt: 5000, completedAt: 8000 }), // 3000
            makeTask({ id: 't3', status: 'skipped' }), // 0
        ])).toBe(5000);
    });
});

// ─── applyTaskCompletion ──────────────────────────────────────────────

describe('applyTaskCompletion', () => {
    const rating: DifficultyRating = 'green';

    it('tâche cours → courseStarted=true, pas de lastTrainingDate', () => {
        const task = makeTask({ taskType: 'cours' });
        const { taskUpdate, progressUpdate } = applyTaskCompletion(task, rating, FIXED_NOW);

        expect(taskUpdate.status).toBe('done');
        expect(taskUpdate.completedAt).toBe(FIXED_NOW);
        expect(taskUpdate.difficultyRating).toBe('green');

        expect(progressUpdate.courseStarted).toBe(true);
        expect(progressUpdate.lastReviewDifficulty).toBe('green');
        expect(progressUpdate.lastWorkedDate).toBeDefined();
        // lastTrainingDate NE DOIT PAS être posé pour un cours
        expect(progressUpdate.lastTrainingDate).toBeUndefined();
    });

    it('annale niveau 1 → level1Done=true + lastTrainingDate', () => {
        const task = makeTask({ taskType: 'annale', annaleLevel: 1 });
        const { progressUpdate } = applyTaskCompletion(task, rating, FIXED_NOW);

        expect(progressUpdate.level1Done).toBe(true);
        expect(progressUpdate.reactivationDone).toBeUndefined();
        expect(progressUpdate.advancedDone).toBeUndefined();
        expect(progressUpdate.courseStarted).toBeUndefined();
        expect(progressUpdate.lastTrainingDate).toBeDefined();
    });

    it('annale niveau 2 → reactivationDone=true', () => {
        const task = makeTask({ taskType: 'annale', annaleLevel: 2 });
        const { progressUpdate } = applyTaskCompletion(task, rating, FIXED_NOW);

        expect(progressUpdate.reactivationDone).toBe(true);
        expect(progressUpdate.level1Done).toBeUndefined();
        expect(progressUpdate.advancedDone).toBeUndefined();
    });

    it('annale niveau 3 → advancedDone=true', () => {
        const task = makeTask({ taskType: 'annale', annaleLevel: 3 });
        const { progressUpdate } = applyTaskCompletion(task, rating, FIXED_NOW);

        expect(progressUpdate.advancedDone).toBe(true);
        expect(progressUpdate.level1Done).toBeUndefined();
        expect(progressUpdate.reactivationDone).toBeUndefined();
    });

    it('annale niveau 4 → advancedDone=true (même au-dessus du seuil)', () => {
        const task = makeTask({ taskType: 'annale', annaleLevel: 4 });
        const { progressUpdate } = applyTaskCompletion(task, rating, FIXED_NOW);

        expect(progressUpdate.advancedDone).toBe(true);
    });

    it('dérive lastWorkedDate au format ISO local (YYYY-MM-DD) depuis `now`', () => {
        const task = makeTask({ taskType: 'annale', annaleLevel: 1 });
        const { progressUpdate } = applyTaskCompletion(task, rating, FIXED_NOW);

        expect(progressUpdate.lastWorkedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
});
