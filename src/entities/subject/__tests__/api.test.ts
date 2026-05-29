import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Subject } from '../types';

// ── Mock userDataRepository ─────────────────────────────────────────
const { getMock, setMock, removeMock, batchGetMock, loadKeyMock } = vi.hoisted(() => ({
    getMock: vi.fn(),
    setMock: vi.fn(),
    removeMock: vi.fn(),
    batchGetMock: vi.fn(),
    loadKeyMock: vi.fn(),
}));

vi.mock('@/shared/api/userDataRepository', () => ({
    userDataRepository: {
        get: getMock,
        set: setMock,
        remove: removeMock,
        batchGet: batchGetMock,
    },
}));

vi.mock('@/shared/api/cloudBatchLoader', () => ({
    loadKey: loadKeyMock,
}));

// Import AFTER mock setup
import { loadSubjects, saveSubjects } from '../api';

// ── Fixtures ────────────────────────────────────────────────────────
function makeSubject(id: string, title = 'Cardio'): Subject {
    return {
        id,
        title,
        iconName: 'Heart',
        chapters: [
            {
                id: `${id}-c1`,
                title: 'Chapitre 1',
                status: { t1: false, annales: false, t2: false },
                progress: {
                    courseStarted: false,
                    level1Done: false,
                    reactivationDone: false,
                    advancedDone: false,
                    firstSeenDate: null,
                    lastWorkedDate: null,
                    lastTrainingDate: null,
                    lastReviewDifficulty: undefined,
                    nextReviewDate: null,
                },
            },
        ],
    };
}

// ── Tests ────────────────────────────────────────────────────────────
describe('entities/subject/api — loadSubjects', () => {
    beforeEach(() => {
        getMock.mockReset();
        loadKeyMock.mockReset();
        setMock.mockReset();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('retourne null quand userDataRepository ne trouve pas la clé', async () => {
        loadKeyMock.mockResolvedValue(null);

        await expect(loadSubjects()).resolves.toBeNull();
        expect(loadKeyMock).toHaveBeenCalledWith('med-pilot-subjects-v4');
    });

    it('retourne un tableau validé quand la valeur cloud existe (round-trip)', async () => {
        const subjects = [makeSubject('s1'), makeSubject('s2', 'Neuro')];
        loadKeyMock.mockResolvedValue(subjects);

        const result = await loadSubjects();
        expect(result).not.toBeNull();
        expect(result).toHaveLength(2);
        expect(result![0].id).toBe('s1');
        expect(result![1].title).toBe('Neuro');
    });

    it('filtre les entrées invalides via validateSubjects (tolérant)', async () => {
        loadKeyMock.mockResolvedValue([
            makeSubject('ok'),
            { id: 'broken', title: 42 }, // title non-string → rejeté
            null,                         // entrée nulle → rejetée
        ]);

        const result = await loadSubjects();
        expect(result).not.toBeNull();
        expect(result).toHaveLength(1);
        expect(result![0].id).toBe('ok');
    });
});

describe('entities/subject/api — saveSubjects', () => {
    beforeEach(() => {
        setMock.mockReset();
    });

    it('délègue à userDataRepository.set avec la clé med-pilot-subjects-v4', async () => {
        const subjects = [makeSubject('s1')];

        await saveSubjects(subjects);

        expect(setMock).toHaveBeenCalledTimes(1);
        expect(setMock).toHaveBeenCalledWith('med-pilot-subjects-v4', subjects);
    });

    it('accepte un tableau vide sans erreur', async () => {
        setMock.mockResolvedValue(undefined);

        await expect(saveSubjects([])).resolves.toBeUndefined();
        expect(setMock).toHaveBeenCalledWith('med-pilot-subjects-v4', []);
    });
});
