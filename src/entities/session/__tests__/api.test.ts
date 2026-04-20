// ─── Session api — unit tests ────────────────────────────────────────
// Couvrent les 5 fonctions de persistance via userDataRepository mocké.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DailySession, SessionHistoryEntry } from '../types';

// ─── Mock userDataRepository ──────────────────────────────────────────
const { getMock, setMock, removeMock, batchGetMock } = vi.hoisted(() => ({
    getMock: vi.fn(),
    setMock: vi.fn(),
    removeMock: vi.fn(),
    batchGetMock: vi.fn(),
}));

vi.mock('@/shared/api/userDataRepository', () => ({
    userDataRepository: {
        get: getMock,
        set: setMock,
        remove: removeMock,
        batchGet: batchGetMock,
    },
}));

// Import AFTER mock setup
import {
    loadDailySession,
    saveDailySession,
    clearDailySession,
    loadSessionHistory,
    appendSessionHistory,
    SESSION_HISTORY_MAX,
} from '../api';

// ─── Fixtures ─────────────────────────────────────────────────────────

function makeSession(date = '2026-04-20'): DailySession {
    return {
        date,
        dayLoad: 'standard',
        tasks: [],
        generatedAt: Date.now(),
    };
}

function makeHistoryEntry(overrides: Partial<SessionHistoryEntry> = {}): SessionHistoryEntry {
    return {
        date: '2026-04-20',
        taskType: 'cours',
        reason: 'nouveau',
        subjectTitle: 'Cardio',
        chapterTitle: 'Insuffisance',
        durationMs: 60000,
        difficultyRating: 'green',
        ...overrides,
    };
}

// ─── loadDailySession ─────────────────────────────────────────────────

describe('loadDailySession', () => {
    beforeEach(() => {
        getMock.mockReset();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('retourne null quand userDataRepository n\'a pas la clé', async () => {
        getMock.mockResolvedValue(null);
        await expect(loadDailySession()).resolves.toBeNull();
        expect(getMock).toHaveBeenCalledWith('med-pilot-daily-session');
    });

    it('retourne la valeur cloud brute sans filtrage de date', async () => {
        // Session "d'hier" : l'api la retourne, filtrage = responsabilité caller
        const stale = makeSession('2026-04-19');
        getMock.mockResolvedValue(stale);
        await expect(loadDailySession()).resolves.toEqual(stale);
    });
});

// ─── saveDailySession ─────────────────────────────────────────────────

describe('saveDailySession', () => {
    beforeEach(() => {
        setMock.mockReset();
    });

    it('délègue à userDataRepository.set avec la clé med-pilot-daily-session', async () => {
        const session = makeSession();
        await saveDailySession(session);

        expect(setMock).toHaveBeenCalledTimes(1);
        expect(setMock).toHaveBeenCalledWith('med-pilot-daily-session', session);
    });
});

// ─── clearDailySession ───────────────────────────────────────────────

describe('clearDailySession', () => {
    beforeEach(() => {
        removeMock.mockReset();
    });

    it('délègue à userDataRepository.remove avec la clé med-pilot-daily-session', async () => {
        await clearDailySession();

        expect(removeMock).toHaveBeenCalledTimes(1);
        expect(removeMock).toHaveBeenCalledWith('med-pilot-daily-session');
    });
});

// ─── loadSessionHistory ──────────────────────────────────────────────

describe('loadSessionHistory', () => {
    beforeEach(() => {
        getMock.mockReset();
    });

    it('retourne [] si aucune valeur cloud', async () => {
        getMock.mockResolvedValue(null);
        await expect(loadSessionHistory()).resolves.toEqual([]);
        expect(getMock).toHaveBeenCalledWith('med-pilot-session-history');
    });

    it('retourne [] si le format stocké n\'est pas un tableau (défensif)', async () => {
        getMock.mockResolvedValue({ corrupted: true });
        await expect(loadSessionHistory()).resolves.toEqual([]);
    });

    it('retourne le tableau cloud tel quel quand il est valide', async () => {
        const history = [makeHistoryEntry(), makeHistoryEntry({ difficultyRating: 'red' })];
        getMock.mockResolvedValue(history);

        const result = await loadSessionHistory();
        expect(result).toHaveLength(2);
        expect(result[1].difficultyRating).toBe('red');
    });
});

// ─── appendSessionHistory ────────────────────────────────────────────

describe('appendSessionHistory', () => {
    beforeEach(() => {
        setMock.mockReset();
    });

    it('append une entrée à une liste vide et persiste', async () => {
        const entry = makeHistoryEntry();
        const result = await appendSessionHistory([], entry);

        expect(result).toEqual([entry]);
        expect(setMock).toHaveBeenCalledWith('med-pilot-session-history', [entry]);
    });

    it('append à la fin (ordre chronologique)', async () => {
        const previous = [
            makeHistoryEntry({ subjectTitle: 'A' }),
            makeHistoryEntry({ subjectTitle: 'B' }),
        ];
        const entry = makeHistoryEntry({ subjectTitle: 'C' });

        const result = await appendSessionHistory(previous, entry);

        expect(result.map(e => e.subjectTitle)).toEqual(['A', 'B', 'C']);
    });

    it('cap à SESSION_HISTORY_MAX (500) — garde les N DERNIÈRES entrées', async () => {
        const huge = Array.from({ length: 500 }, (_, i) =>
            makeHistoryEntry({ subjectTitle: `S${i}` }),
        );
        const entry = makeHistoryEntry({ subjectTitle: 'SNEW' });

        const result = await appendSessionHistory(huge, entry);

        expect(result).toHaveLength(SESSION_HISTORY_MAX);
        // Première entrée S0 a été évincée
        expect(result[0].subjectTitle).toBe('S1');
        // La nouvelle est en queue
        expect(result[result.length - 1].subjectTitle).toBe('SNEW');
    });

    it('respecte maxSize custom (pour tests plus rapides)', async () => {
        const prev = [
            makeHistoryEntry({ subjectTitle: 'A' }),
            makeHistoryEntry({ subjectTitle: 'B' }),
        ];
        const entry = makeHistoryEntry({ subjectTitle: 'C' });

        const result = await appendSessionHistory(prev, entry, 2);

        expect(result).toHaveLength(2);
        expect(result.map(e => e.subjectTitle)).toEqual(['B', 'C']);
    });
});
