import { describe, it, expect } from 'vitest';
import { createEmptyStrategy, isValidStrategy } from '../model';
import type { ActiveStrategy } from '../types';

// ─── createEmptyStrategy ─────────────────────────────────────────────

describe('entities/strategy/model — createEmptyStrategy', () => {
    it('retourne une stratégie vierge en mode preparation', () => {
        const s = createEmptyStrategy();

        expect(s.mode).toBe('preparation');
        expect(s.preparationSubjectIds).toEqual([]);
        expect(s.preparationDeadline).toBeNull();
        expect(s.rushSubjectIds).toEqual([]);
        expect(s.vacancesObjectif).toBeNull();
        expect(s.vacancesSubjectIds).toEqual([]);
        expect(s.vacancesDuree).toBeNull();
        expect(s.vacancesPerimetre).toBeNull();
        expect(typeof s.createdAt).toBe('number');
        expect(s.createdAt).toBeGreaterThan(0);
    });

    it('retourne une nouvelle référence à chaque appel (pas de partage)', () => {
        const a = createEmptyStrategy();
        const b = createEmptyStrategy();

        expect(a).not.toBe(b);
        expect(a.preparationSubjectIds).not.toBe(b.preparationSubjectIds);

        a.preparationSubjectIds.push('s1');
        expect(b.preparationSubjectIds).toEqual([]);
    });
});

// ─── isValidStrategy ─────────────────────────────────────────────────

describe('entities/strategy/model — isValidStrategy', () => {
    it('accepte une stratégie complète issue de createEmptyStrategy', () => {
        const s: ActiveStrategy = createEmptyStrategy();
        expect(isValidStrategy(s)).toBe(true);
    });

    it('accepte une stratégie rush avec subjects ids peuplés', () => {
        const s: ActiveStrategy = {
            ...createEmptyStrategy(),
            mode: 'rush',
            rushSubjectIds: ['s1', 's2'],
        };
        expect(isValidStrategy(s)).toBe(true);
    });

    it('rejette null', () => {
        expect(isValidStrategy(null)).toBe(false);
    });

    it('rejette undefined', () => {
        expect(isValidStrategy(undefined)).toBe(false);
    });

    it('rejette un ancien schéma sans preparationSubjectIds (pre-refactor)', () => {
        const oldShape = { mode: 'preparation', createdAt: Date.now() };
        expect(isValidStrategy(oldShape)).toBe(false);
    });

    it('rejette un ancien schéma avec preparationSubjectId singulier (pre-refactor)', () => {
        const oldShape = {
            mode: 'preparation',
            preparationSubjectId: 's1',  // singulier, ancien format
            createdAt: Date.now(),
        };
        expect(isValidStrategy(oldShape)).toBe(false);
    });

    it('rejette un objet partiel (mode absent)', () => {
        const partial = {
            preparationSubjectIds: [],
            createdAt: Date.now(),
        };
        expect(isValidStrategy(partial)).toBe(false);
    });

    it('rejette une primitive string', () => {
        expect(isValidStrategy('not a strategy')).toBe(false);
    });

    it('rejette un tableau', () => {
        expect(isValidStrategy([])).toBe(false);
    });

    it('rejette un objet dont preparationSubjectIds n\'est pas un tableau', () => {
        const bad = {
            mode: 'preparation',
            preparationSubjectIds: 'not-an-array',
            createdAt: Date.now(),
        };
        expect(isValidStrategy(bad)).toBe(false);
    });
});
