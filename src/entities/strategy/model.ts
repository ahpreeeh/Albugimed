// ─── Strategy entity — model (fonctions pures) ───────────────────
// Pas de React, pas d'I/O. Deux fonctions :
//  - createEmptyStrategy : fabrique d'une stratégie vierge (mode preparation).
//  - isValidStrategy     : type guard qui matérialise le filtre inline
//                          de StrategyContext.tsx L27-33 pour rejeter les
//                          stratégies au format pré-refactor.

import type { ActiveStrategy } from './types';

/**
 * Fabrique d'une stratégie vide en mode preparation par défaut.
 * Utilisée par StrategyModal au bootstrap et lors du changement de mode.
 */
export function createEmptyStrategy(): ActiveStrategy {
    return {
        mode: 'preparation',
        preparationSubjectIds: [],
        preparationDeadline: null,
        rushSubjectIds: [],
        vacancesObjectif: null,
        vacancesSubjectIds: [],
        vacancesDuree: null,
        vacancesPerimetre: null,
        createdAt: Date.now(),
    };
}

/**
 * Type guard : une valeur arbitraire est-elle une ActiveStrategy valide ?
 *
 * Matérialise la sémantique exacte de la guard inline de StrategyContext :
 *   rawStrategy && rawStrategy.mode && Array.isArray(rawStrategy.preparationSubjectIds)
 *
 * Critères minimaux : objet non-null/non-primitive, champ `mode` truthy,
 * champ `preparationSubjectIds` est un tableau. Sert à rejeter silencieusement
 * les stratégies d'un ancien schéma (avant l'introduction du multi-select).
 */
export function isValidStrategy(value: unknown): value is ActiveStrategy {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Partial<ActiveStrategy>;
    if (!candidate.mode) return false;
    if (!Array.isArray(candidate.preparationSubjectIds)) return false;
    return true;
}
