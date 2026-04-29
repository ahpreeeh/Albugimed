// ─── Session store — unit tests ──────────────────────────────────────
// Teste le store Zustand hors-React via getState/setState.
// Mock complet de api.ts + localStorage pour isolation.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DailySession, SessionHistoryEntry } from '../types';
import type { ActiveStrategy } from '@/entities/strategy/types';
import type { Subject } from '@/entities/subject/types';
import { createDefaultProgress } from '@/entities/subject/model';

// ─── Mock api.ts ─────────────────────────────────────────────────────
const {
    loadDailySessionMock,
    saveDailySessionMock,
    clearDailySessionMock,
    loadSessionHistoryMock,
    appendSessionHistoryMock,
} = vi.hoisted(() => ({
    loadDailySessionMock: vi.fn(),
    saveDailySessionMock: vi.fn(),
    clearDailySessionMock: vi.fn(),
    loadSessionHistoryMock: vi.fn(),
    appendSessionHistoryMock: vi.fn(),
}));

vi.mock('../api', async (importOriginal) => {
    const mod = await importOriginal<typeof import('../api')>();
    return {
        ...mod,
        loadDailySession: loadDailySessionMock,
        saveDailySession: saveDailySessionMock,
        clearDailySession: clearDailySessionMock,
        loadSessionHistory: loadSessionHistoryMock,
        appendSessionHistory: appendSessionHistoryMock,
    };
});

// Import AFTER mock setup
import { useSessionStore } from '../store';

// ─── Fixtures ─────────────────────────────────────────────────────────

const FIXED_NOW = new Date('2026-04-20T10:00:00Z').getTime();
const TODAY = '2026-04-20';

function makeStrategy(): ActiveStrategy {
    return {
        mode: 'preparation',
        preparationSubjectIds: ['s1'],
        preparationDeadline: null,
        rushSubjectIds: [],
        vacancesObjectif: null,
        vacancesSubjectIds: [],
        vacancesDuree: null,
        vacancesPerimetre: null,
        createdAt: 0,
    };
}

function makeSubject(): Subject {
    return {
        id: 's1',
        title: 'Cardio',
        iconName: 'heart',
        chapters: [
            {
                id: 'c1',
                title: 'Chap 1',
                status: { t1: false, annales: false, t2: false },
                progress: createDefaultProgress(),
            },
        ],
    };
}

function makeSession(date = TODAY): DailySession {
    return {
        date,
        dayLoad: 'standard',
        tasks: [
            {
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
            },
        ],
        generatedAt: FIXED_NOW,
    };
}

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

// ─── Helpers ──────────────────────────────────────────────────────────

function resetStore() {
    useSessionStore.setState({
        session: null,
        history: [],
        isHydrated: false,
    });
}

// ─── beforeEach / afterEach ───────────────────────────────────────────

beforeEach(() => {
    resetStore();
    loadDailySessionMock.mockReset();
    saveDailySessionMock.mockReset();
    clearDailySessionMock.mockReset();
    loadSessionHistoryMock.mockReset();
    appendSessionHistoryMock.mockReset();
    // Defaults : cloud réponse null / empty
    loadDailySessionMock.mockResolvedValue(null);
    saveDailySessionMock.mockResolvedValue(undefined);
    clearDailySessionMock.mockResolvedValue(undefined);
    loadSessionHistoryMock.mockResolvedValue([]);
    appendSessionHistoryMock.mockImplementation(
        async (current: SessionHistoryEntry[], entry: SessionHistoryEntry) =>
            [...current, entry].slice(-500),
    );
    // Clean localStorage between tests
    if (typeof window !== 'undefined') {
        window.localStorage.clear();
    }
});

afterEach(() => {
    vi.clearAllMocks();
});

// ─── hydrate ──────────────────────────────────────────────────────────

describe('hydrate', () => {
    it('ne set rien quand ni localStorage ni cloud n\'ont de session', async () => {
        await useSessionStore.getState().hydrate(TODAY);

        expect(useSessionStore.getState().session).toBeNull();
        expect(useSessionStore.getState().isHydrated).toBe(true);
    });

    it('restore depuis localStorage instantanément (si date === today)', async () => {
        const local = makeSession(TODAY);
        window.localStorage.setItem('med-pilot-daily-session', JSON.stringify(local));

        await useSessionStore.getState().hydrate(TODAY);

        expect(useSessionStore.getState().session).toEqual(local);
    });

    it('ignore la session locale si date !== today', async () => {
        const stale = makeSession('2026-04-19');
        window.localStorage.setItem('med-pilot-daily-session', JSON.stringify(stale));

        await useSessionStore.getState().hydrate(TODAY);

        expect(useSessionStore.getState().session).toBeNull();
    });

    it('cloud override local quand cloud retourne une session today', async () => {
        const localOld = { ...makeSession(TODAY), generatedAt: 1 };
        const cloudNew = { ...makeSession(TODAY), generatedAt: 2 };
        window.localStorage.setItem('med-pilot-daily-session', JSON.stringify(localOld));
        loadDailySessionMock.mockResolvedValue(cloudNew);

        await useSessionStore.getState().hydrate(TODAY);

        expect(useSessionStore.getState().session?.generatedAt).toBe(2);
        // local écrit avec le cloud
        expect(JSON.parse(window.localStorage.getItem('med-pilot-daily-session')!).generatedAt).toBe(2);
    });

    it('ignore cloud si date !== today', async () => {
        const cloudStale = makeSession('2026-04-19');
        loadDailySessionMock.mockResolvedValue(cloudStale);

        await useSessionStore.getState().hydrate(TODAY);

        expect(useSessionStore.getState().session).toBeNull();
    });

    it('clear la session mémoire existante si ni local ni cloud ne matchent today', async () => {
        useSessionStore.setState({
            session: makeSession(TODAY),
            history: [],
            isHydrated: false,
        });
        window.localStorage.setItem(
            'med-pilot-daily-session',
            JSON.stringify(makeSession('2026-04-19')),
        );
        loadDailySessionMock.mockResolvedValue(null);

        await useSessionStore.getState().hydrate(TODAY);

        expect(useSessionStore.getState().session).toBeNull();
        expect(useSessionStore.getState().isHydrated).toBe(true);
    });

    it('charge history depuis cloud', async () => {
        const h: SessionHistoryEntry[] = [
            {
                date: TODAY,
                taskType: 'cours',
                reason: 'nouveau',
                subjectTitle: 'Cardio',
                chapterTitle: 'C1',
                durationMs: 1000,
                difficultyRating: 'green',
            },
        ];
        loadSessionHistoryMock.mockResolvedValue(h);

        await useSessionStore.getState().hydrate(TODAY);

        expect(useSessionStore.getState().history).toEqual(h);
        expect(useSessionStore.getState().isHydrated).toBe(true);
    });

    it('passe isHydrated à true même si cloud fail', async () => {
        loadDailySessionMock.mockRejectedValue(new Error('network'));
        loadSessionHistoryMock.mockRejectedValue(new Error('network'));

        await useSessionStore.getState().hydrate(TODAY);

        expect(useSessionStore.getState().isHydrated).toBe(true);
    });
});

// ─── generateSession ──────────────────────────────────────────────────

describe('generateSession', () => {
    it('crée une session et la persiste (cloud + local)', () => {
        useSessionStore.getState().generateSession(
            makeStrategy(),
            [makeSubject()],
            'standard',
            TODAY,
            FIXED_NOW,
        );

        const state = useSessionStore.getState();
        expect(state.session).not.toBeNull();
        expect(state.session!.date).toBe(TODAY);
        expect(state.session!.dayLoad).toBe('standard');
        expect(saveDailySessionMock).toHaveBeenCalledTimes(1);

        const local = window.localStorage.getItem('med-pilot-daily-session');
        expect(local).not.toBeNull();
    });
});

// ─── startTask ────────────────────────────────────────────────────────

describe('startTask', () => {
    it('passe la tâche en in-progress + startedAt', () => {
        useSessionStore.setState({ session: makeSession(), isHydrated: true });

        useSessionStore.getState().startTask('task-1', FIXED_NOW);

        const task = useSessionStore.getState().session!.tasks[0];
        expect(task.status).toBe('in-progress');
        expect(task.startedAt).toBe(FIXED_NOW);
        expect(saveDailySessionMock).toHaveBeenCalledTimes(1);
    });

    it('no-op si pas de session', () => {
        useSessionStore.getState().startTask('task-1', FIXED_NOW);
        expect(useSessionStore.getState().session).toBeNull();
        expect(saveDailySessionMock).not.toHaveBeenCalled();
    });

    it('no-op si taskId introuvable (session conservée inchangée structurellement)', () => {
        useSessionStore.setState({ session: makeSession(), isHydrated: true });

        useSessionStore.getState().startTask('unknown-task', FIXED_NOW);

        const task = useSessionStore.getState().session!.tasks[0];
        expect(task.status).toBe('pending'); // unchanged
    });
});

// ─── completeTask ─────────────────────────────────────────────────────

describe('completeTask', () => {
    it('retourne null si pas de session', () => {
        const result = useSessionStore.getState().completeTask('t1', 'green', FIXED_NOW);
        expect(result).toBeNull();
    });

    it('retourne null si taskId introuvable', () => {
        useSessionStore.setState({ session: makeSession(), isHydrated: true });
        const result = useSessionStore.getState().completeTask('unknown', 'green', FIXED_NOW);
        expect(result).toBeNull();
    });

    it('met la tâche en done + retourne progressUpdate (cours → courseStarted)', () => {
        useSessionStore.setState({ session: makeSession(), isHydrated: true });

        const result = useSessionStore.getState().completeTask('task-1', 'green', FIXED_NOW);

        expect(result).not.toBeNull();
        expect(result!.subjectId).toBe('s1');
        expect(result!.chapterId).toBe('c1');
        expect(result!.progressUpdate.courseStarted).toBe(true);
        expect(result!.progressUpdate.lastReviewDifficulty).toBe('green');

        const task = useSessionStore.getState().session!.tasks[0];
        expect(task.status).toBe('done');
        expect(task.completedAt).toBe(FIXED_NOW);
        expect(task.difficultyRating).toBe('green');

        expect(saveDailySessionMock).toHaveBeenCalledTimes(1);
    });

    it('append une entry à l\'history (optimiste + retour cloud)', async () => {
        useSessionStore.setState({ session: makeSession(), isHydrated: true });

        useSessionStore.getState().completeTask('task-1', 'orange', FIXED_NOW);

        // L'append optimiste a déjà eu lieu (synchrone)
        expect(useSessionStore.getState().history).toHaveLength(1);
        expect(useSessionStore.getState().history[0].difficultyRating).toBe('orange');

        // Le mock retourne la version "cloud-echo" (identique ici) — attendre la promise
        await vi.waitFor(() => {
            expect(appendSessionHistoryMock).toHaveBeenCalledTimes(1);
        });
    });

    it('ne réécrase pas un historique plus récent quand deux complétions résolvent hors ordre', async () => {
        const firstAppend = deferred<SessionHistoryEntry[]>();
        const secondAppend = deferred<SessionHistoryEntry[]>();
        appendSessionHistoryMock
            .mockImplementationOnce(() => firstAppend.promise)
            .mockImplementationOnce(() => secondAppend.promise);

        const session = makeSession();
        session.tasks = [
            session.tasks[0],
            {
                ...session.tasks[0],
                id: 'task-2',
                chapterId: 'c2',
                chapterTitle: 'Chap 2',
            },
        ];
        useSessionStore.setState({ session, history: [], isHydrated: true });

        useSessionStore.getState().completeTask('task-1', 'green', FIXED_NOW);
        useSessionStore.getState().completeTask('task-2', 'red', FIXED_NOW + 1_000);

        expect(useSessionStore.getState().history).toHaveLength(2);
        expect(useSessionStore.getState().history.map((entry) => entry.chapterTitle)).toEqual(
            ['Chap 1', 'Chap 2'],
        );

        secondAppend.resolve([{
            date: TODAY,
            taskType: 'cours',
            reason: 'nouveau',
            subjectTitle: 'Cardio',
            chapterTitle: 'Chap 1',
            durationMs: 0,
            difficultyRating: 'green',
        }, {
            date: TODAY,
            taskType: 'cours',
            reason: 'nouveau',
            subjectTitle: 'Cardio',
            chapterTitle: 'Chap 2',
            durationMs: 0,
            difficultyRating: 'red',
        }]);
        firstAppend.resolve([{
            date: TODAY,
            taskType: 'cours',
            reason: 'nouveau',
            subjectTitle: 'Cardio',
            chapterTitle: 'Chap 1',
            durationMs: 0,
            difficultyRating: 'green',
        }]);

        await Promise.allSettled([firstAppend.promise, secondAppend.promise]);

        expect(useSessionStore.getState().history).toHaveLength(2);
        expect(useSessionStore.getState().history.map((entry) => entry.chapterTitle)).toEqual(
            ['Chap 1', 'Chap 2'],
        );
    });

    it('calcule durationMs depuis startedAt si présent', () => {
        const session = makeSession();
        session.tasks[0].startedAt = FIXED_NOW - 30_000; // 30s plus tôt
        session.tasks[0].status = 'in-progress';
        useSessionStore.setState({ session, isHydrated: true });

        useSessionStore.getState().completeTask('task-1', 'blue', FIXED_NOW);

        expect(useSessionStore.getState().history[0].durationMs).toBe(30_000);
    });

    it('durationMs=0 quand startedAt absent', () => {
        useSessionStore.setState({ session: makeSession(), isHydrated: true });
        useSessionStore.getState().completeTask('task-1', 'blue', FIXED_NOW);

        expect(useSessionStore.getState().history[0].durationMs).toBe(0);
    });
});

// ─── skipTask ─────────────────────────────────────────────────────────

describe('skipTask', () => {
    it('passe la tâche en skipped', () => {
        useSessionStore.setState({ session: makeSession(), isHydrated: true });

        useSessionStore.getState().skipTask('task-1');

        expect(useSessionStore.getState().session!.tasks[0].status).toBe('skipped');
        expect(saveDailySessionMock).toHaveBeenCalledTimes(1);
    });
});

// ─── clearSession ─────────────────────────────────────────────────────

describe('clearSession', () => {
    it('vide la session et appelle clearDailySession cloud', () => {
        useSessionStore.setState({ session: makeSession(), isHydrated: true });

        useSessionStore.getState().clearSession();

        expect(useSessionStore.getState().session).toBeNull();
        expect(clearDailySessionMock).toHaveBeenCalledTimes(1);
        // localStorage aussi supprimé
        expect(window.localStorage.getItem('med-pilot-daily-session')).toBeNull();
    });
});

// ─── setSession ───────────────────────────────────────────────────────

describe('setSession', () => {
    it('remplace la session et persiste', () => {
        const s = makeSession();
        useSessionStore.getState().setSession(s);

        expect(useSessionStore.getState().session).toEqual(s);
        expect(saveDailySessionMock).toHaveBeenCalledWith(s);
    });

    it('null → clear cloud', () => {
        useSessionStore.setState({ session: makeSession() });

        useSessionStore.getState().setSession(null);

        expect(useSessionStore.getState().session).toBeNull();
        expect(clearDailySessionMock).toHaveBeenCalledTimes(1);
    });
});
