// ─── Planning model — unit tests ──────────────────────────────────────
// Couvrent les fonctions pures du planning extraites de PlanningView.tsx
// (Phase 5, step 5.2). Filet de sécurité avant l'extraction des
// composants en features/planning-* (Lots Y → AA).

import { describe, it, expect } from 'vitest';
import {
    toISODate,
    addDays,
    formatWeekRange,
    timeToMinutes,
    minutesToTime,
    timeToTop,
    durationToHeight,
    addHourHelper,
    layoutOverlaps,
    parseNLPInput,
} from '../model';
import type { GridItem } from '../types';
import { START_HOUR, HOUR_HEIGHT } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────

function makeGridItem(overrides: Partial<GridItem> = {}): GridItem {
    return {
        id: 'g1',
        originalId: 'o1',
        title: 'Test',
        date: '2026-04-25',
        startTime: '08:00',
        endTime: '09:00',
        isDefault: false,
        source: 'event',
        type: 'event',
        top: 0,
        height: 60,
        left: 0,
        width: 1,
        ...overrides,
    };
}

// ─── toISODate ────────────────────────────────────────────────────────

describe('toISODate', () => {
    it('formate une date locale en YYYY-MM-DD', () => {
        const d = new Date(2026, 3, 25); // April 25 (mois 0-indexed)
        expect(toISODate(d)).toBe('2026-04-25');
    });

    it('zero-pad le mois et le jour', () => {
        const d = new Date(2026, 0, 5); // 5 jan
        expect(toISODate(d)).toBe('2026-01-05');
    });

    it('utilise les composantes locales (pas UTC)', () => {
        // Ne dépend pas du fuseau : on construit avec composants locaux
        const d = new Date(2025, 11, 31);
        expect(toISODate(d)).toBe('2025-12-31');
    });
});

// ─── addDays ──────────────────────────────────────────────────────────

describe('addDays', () => {
    it('ajoute n jours sans muter l\'original', () => {
        const original = new Date(2026, 3, 25);
        const next = addDays(original, 3);
        expect(toISODate(next)).toBe('2026-04-28');
        expect(toISODate(original)).toBe('2026-04-25');
    });

    it('accepte des jours négatifs', () => {
        const d = new Date(2026, 3, 25);
        expect(toISODate(addDays(d, -5))).toBe('2026-04-20');
    });

    it('traverse les frontières de mois', () => {
        const d = new Date(2026, 3, 30); // 30 avril
        expect(toISODate(addDays(d, 5))).toBe('2026-05-05');
    });

    it('traverse l\'année', () => {
        const d = new Date(2025, 11, 30); // 30 déc
        expect(toISODate(addDays(d, 5))).toBe('2026-01-04');
    });
});

// ─── formatWeekRange ──────────────────────────────────────────────────

describe('formatWeekRange', () => {
    it('même mois → "X au Y mois année"', () => {
        const monday = new Date(2026, 3, 20);
        expect(formatWeekRange(monday)).toBe('20 au 26 avril 2026');
    });

    it('chevauche deux mois → "X mois1 au Y mois2 année"', () => {
        const monday = new Date(2026, 3, 27); // 27 avril
        expect(formatWeekRange(monday)).toBe('27 avril au 3 mai 2026');
    });
});

// ─── timeToMinutes / minutesToTime ────────────────────────────────────

describe('timeToMinutes', () => {
    it('convertit "HH:MM" en minutes absolues', () => {
        expect(timeToMinutes('00:00')).toBe(0);
        expect(timeToMinutes('01:30')).toBe(90);
        expect(timeToMinutes('23:59')).toBe(23 * 60 + 59);
    });

    it('tolère un format sans minutes ("HH")', () => {
        expect(timeToMinutes('14')).toBe(14 * 60);
    });
});

describe('minutesToTime', () => {
    it('convertit les minutes en "HH:MM" zero-padded', () => {
        expect(minutesToTime(0)).toBe('00:00');
        expect(minutesToTime(90)).toBe('01:30');
        expect(minutesToTime(23 * 60 + 5)).toBe('23:05');
    });

    it('round-trip avec timeToMinutes', () => {
        const inputs = ['00:00', '06:15', '12:00', '17:45', '23:59'];
        for (const t of inputs) {
            expect(minutesToTime(timeToMinutes(t))).toBe(t);
        }
    });
});

// ─── timeToTop / durationToHeight ─────────────────────────────────────

describe('timeToTop', () => {
    it('retourne 0 à START_HOUR', () => {
        const time = `${String(START_HOUR).padStart(2, '0')}:00`;
        expect(timeToTop(time)).toBe(0);
    });

    it('retourne HOUR_HEIGHT par heure après START_HOUR', () => {
        const time = `${String(START_HOUR + 2).padStart(2, '0')}:00`;
        expect(timeToTop(time)).toBe(2 * HOUR_HEIGHT);
    });

    it('retourne une valeur négative avant START_HOUR', () => {
        // START_HOUR = 6 par défaut → 04:00 = -2 heures = -120
        const time = `${String(Math.max(START_HOUR - 2, 0)).padStart(2, '0')}:00`;
        expect(timeToTop(time)).toBe(-2 * HOUR_HEIGHT);
    });
});

describe('durationToHeight', () => {
    it('1 heure → HOUR_HEIGHT', () => {
        expect(durationToHeight('08:00', '09:00')).toBe(HOUR_HEIGHT);
    });

    it('30 minutes → HOUR_HEIGHT/2', () => {
        expect(durationToHeight('08:00', '08:30')).toBe(HOUR_HEIGHT / 2);
    });

    it('garantit une hauteur minimale de 20px', () => {
        expect(durationToHeight('08:00', '08:05')).toBe(20);
    });
});

// ─── addHourHelper ────────────────────────────────────────────────────

describe('addHourHelper', () => {
    it('ajoute 1 heure par défaut', () => {
        expect(addHourHelper('08:00')).toBe('09:00');
        expect(addHourHelper('14:30')).toBe('15:30');
    });

    it('accepte une durée custom', () => {
        expect(addHourHelper('08:00', 2)).toBe('10:00');
        expect(addHourHelper('08:00', 0.5)).toBe('08:30');
    });

    it('cap à END_HOUR (23)', () => {
        expect(addHourHelper('22:30', 5)).toBe('23:00');
    });
});

// ─── layoutOverlaps ───────────────────────────────────────────────────

describe('layoutOverlaps', () => {
    it('liste vide → []', () => {
        expect(layoutOverlaps([])).toEqual([]);
    });

    it('un seul item → left=0, width=1', () => {
        const items = [makeGridItem({ id: 'a' })];
        const result = layoutOverlaps(items);
        expect(result).toHaveLength(1);
        expect(result[0].left).toBe(0);
        expect(result[0].width).toBe(1);
    });

    it('deux items qui se chevauchent → 2 colonnes (left=0/0.5, width=0.5)', () => {
        const items = [
            makeGridItem({ id: 'a', startTime: '08:00', endTime: '10:00' }),
            makeGridItem({ id: 'b', startTime: '09:00', endTime: '11:00' }),
        ];
        const result = layoutOverlaps(items);
        expect(result).toHaveLength(2);
        const a = result.find(r => r.id === 'a')!;
        const b = result.find(r => r.id === 'b')!;
        expect(a.left).toBe(0);
        expect(a.width).toBe(0.5);
        expect(b.left).toBe(0.5);
        expect(b.width).toBe(0.5);
    });

    it('deux items consécutifs (pas d\'overlap) → 1 colonne, full width', () => {
        const items = [
            makeGridItem({ id: 'a', startTime: '08:00', endTime: '09:00' }),
            makeGridItem({ id: 'b', startTime: '09:00', endTime: '10:00' }),
        ];
        const result = layoutOverlaps(items);
        expect(result.every(r => r.left === 0 && r.width === 1)).toBe(true);
    });

    it('5 items qui se chevauchent tous → cap à 4 colonnes (le 5e empilé col 0)', () => {
        const items = Array.from({ length: 5 }, (_, i) =>
            makeGridItem({
                id: `a${i}`,
                startTime: '08:00',
                endTime: '12:00',
            }),
        );
        const result = layoutOverlaps(items);
        // 4 colonnes max
        const lefts = new Set(result.map(r => r.left));
        expect(lefts.size).toBe(4);
        // largeur 1/4 pour tous
        expect(result.every(r => r.width === 0.25)).toBe(true);
    });

    it('trie par heure de début (a placé avant b, b placé avant c)', () => {
        const items = [
            makeGridItem({ id: 'c', startTime: '11:00', endTime: '12:00' }),
            makeGridItem({ id: 'a', startTime: '08:00', endTime: '09:00' }),
            makeGridItem({ id: 'b', startTime: '09:00', endTime: '10:30' }),
        ];
        const result = layoutOverlaps(items);
        // Aucun overlap → tous col 0
        expect(result.every(r => r.left === 0)).toBe(true);
    });
});

// ─── parseNLPInput ────────────────────────────────────────────────────

describe('parseNLPInput', () => {
    const REF = new Date(2026, 3, 25, 12, 0, 0); // 25 avril 2026 12:00 local

    it('texte sans date → title = input brut, date = null', () => {
        const result = parseNLPInput('Pause café', REF);
        expect(result.date).toBeNull();
        expect(result.title).toBe('Pause café');
        expect(result.time).toBeUndefined();
    });

    it('date absolue → date parsée, titre = input moins ce que chrono a matché', () => {
        // chrono.fr matche "5 mai" mais PAS le "le" qui le précède.
        // Le stripping enlève donc "5 mai" → "Examen le " → trim → "Examen le".
        // Comportement préservé 1:1 depuis PlanningView.tsx.
        const result = parseNLPInput('Examen le 5 mai', REF);
        expect(result.date).toBe('2026-05-05');
        expect(result.title).toBe('Examen le');
    });

    it('date absolue sans particule → titre propre', () => {
        const result = parseNLPInput('Examen 5 mai', REF);
        expect(result.date).toBe('2026-05-05');
        expect(result.title).toBe('Examen');
    });

    it('"demain" → date = lendemain de la référence', () => {
        const result = parseNLPInput('Révision demain', REF);
        expect(result.date).toBe('2026-04-26');
    });

    it('inclut l\'heure si chrono est certain de l\'heure', () => {
        const result = parseNLPInput('Cours demain à 14h', REF);
        expect(result.date).toBe('2026-04-26');
        expect(result.time).toBe('14:00');
    });

    it('input vide → title = "" et date null', () => {
        const result = parseNLPInput('', REF);
        expect(result.date).toBeNull();
        expect(result.title).toBe('');
    });

    it('forwardDate : "lundi" → projette vers le futur', () => {
        // 25 avril 2026 = samedi → "lundi" doit donner lundi prochain (27)
        const result = parseNLPInput('Réunion lundi', REF);
        expect(result.date).toBe('2026-04-27');
    });
});
