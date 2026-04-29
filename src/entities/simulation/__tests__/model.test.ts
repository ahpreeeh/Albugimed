import { describe, expect, it, vi } from 'vitest';
import {
    buildAnkiTsv,
    extractErrorCapture,
} from '../model';
import type { ErrorEntry } from '../types';

function makeError(overrides: Partial<ErrorEntry> = {}): ErrorEntry {
    return {
        id: 'existing',
        matiere: 'Cardiologie',
        question: 'Diagnostic ?',
        erreur_commise: 'Erreur',
        correction: 'Correction',
        date: 1000,
        isExported: false,
        ...overrides,
    };
}

describe('extractErrorCapture', () => {
    it('retire le bloc capture du texte visible et crée une entrée erreur', () => {
        const text = `Réponse visible.
[CAPTURE_ERREUR]
{"matiere":"Cardiologie","question":"Diagnostic ?","erreur_commise":"IDM oublié","correction":"Faire ECG"}
[/CAPTURE_ERREUR]`;

        const result = extractErrorCapture(text, [], {
            createId: () => 'err-1',
            now: () => 42,
        });

        expect(result.cleanText).toBe('Réponse visible.');
        expect(result.capturedErrors).toHaveLength(1);
        expect(result.errors[0]).toEqual({
            id: 'err-1',
            matiere: 'Cardiologie',
            question: 'Diagnostic ?',
            erreur_commise: 'IDM oublié',
            correction: 'Faire ECG',
            date: 42,
            isExported: false,
        });
    });

    it('déduplique par matiere + question', () => {
        const existing = [makeError()];
        const text = `[CAPTURE_ERREUR]
{"matiere":"Cardiologie","question":"Diagnostic ?","erreur_commise":"Autre","correction":"Autre"}
[/CAPTURE_ERREUR]`;

        const result = extractErrorCapture(text, existing, {
            createId: () => 'new',
            now: () => 42,
        });

        expect(result.errors).toEqual(existing);
        expect(result.capturedErrors).toEqual([]);
        expect(result.cleanText).toBe('');
    });

    it('applique les fallbacks historiques quand des champs sont absents', () => {
        const result = extractErrorCapture(`[CAPTURE_ERREUR]{}[/CAPTURE_ERREUR]`, [], {
            createId: () => 'fallback',
            now: () => 1,
        });

        expect(result.errors[0]).toMatchObject({
            id: 'fallback',
            matiere: 'Non classé',
            question: 'Question inconnue',
            erreur_commise: 'Erreur non spécifiée',
            correction: 'Voir débriefing',
            date: 1,
            isExported: false,
        });
    });

    it('gère plusieurs captures et place la plus récente en tête', () => {
        let id = 0;
        const result = extractErrorCapture(`
[CAPTURE_ERREUR]{"matiere":"A","question":"Q1","erreur_commise":"E1","correction":"C1"}[/CAPTURE_ERREUR]
[CAPTURE_ERREUR]{"matiere":"B","question":"Q2","erreur_commise":"E2","correction":"C2"}[/CAPTURE_ERREUR]
`, [], {
            createId: () => `err-${++id}`,
            now: () => 1,
        });

        expect(result.capturedErrors.map(error => error.id)).toEqual(['err-1', 'err-2']);
        expect(result.errors.map(error => error.id)).toEqual(['err-2', 'err-1']);
    });

    it('supprime un bloc JSON invalide sans créer d’entrée', () => {
        const onParseError = vi.fn();
        const result = extractErrorCapture(
            'Texte [CAPTURE_ERREUR]{bad json}[/CAPTURE_ERREUR]',
            [],
            { onParseError },
        );

        expect(result.cleanText).toBe('Texte');
        expect(result.errors).toEqual([]);
        expect(onParseError).toHaveBeenCalledTimes(1);
    });
});

describe('buildAnkiTsv', () => {
    it('retourne une chaîne vide sans flashcards', () => {
        expect(buildAnkiTsv([])).toBe('');
    });

    it('génère deux colonnes Anki séparées par tabulation', () => {
        expect(buildAnkiTsv([
            { question: 'Question 1', reponse: 'Réponse 1' },
            { question: 'Question 2', reponse: 'Réponse 2' },
        ])).toBe('Question 1\tRéponse 1\r\nQuestion 2\tRéponse 2\r\n');
    });

    it('neutralise tabulations et retours ligne dans les champs', () => {
        expect(buildAnkiTsv([
            { question: 'Q\t1\nsuite', reponse: 'R\r\n1' },
        ])).toBe('Q 1 suite\tR 1\r\n');
    });
});
