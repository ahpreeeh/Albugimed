// ─── Strategy Types — BC re-export ───────────────────────────────
// Cette source est une façade de compat. Les types et constantes vivent
// désormais dans entities/strategy/types. createEmptyStrategy sera
// déplacée vers entities/strategy/model au step 2.8.
//
// Ce fichier sera supprimé au step 2.10 après migration des 7 consommateurs.

export type {
    StrategyMode,
    VacationObjective,
    LearningScope,
    DayLoad,
    ActiveStrategy,
} from '@/entities/strategy/types';

export { DUREES } from '@/entities/strategy/types';

import type { ActiveStrategy } from '@/entities/strategy/types';

// createEmptyStrategy reste inline jusqu'au step 2.8 (move vers model.ts).
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
