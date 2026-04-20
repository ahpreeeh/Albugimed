// ─── Strategy entity — types ─────────────────────────────────────
// Defines the long-term study strategy (mode, targets, deadlines).
// The day-load (plancher/standard/plafond) is NOT here — it's a daily
// choice made on the Session Widget.
//
// DUREES reste colocalisée avec les types (constante de domaine utilisée
// uniquement par StrategyModal pour le mode vacances).

export type StrategyMode = 'preparation' | 'rush' | 'vacances';

export type VacationObjective = 'revision' | 'apprentissage';
export type LearningScope = 'coeur' | 'elargissement';

export type DayLoad = 'plancher' | 'standard' | 'plafond';

export interface ActiveStrategy {
    mode: StrategyMode;
    // --- Preparation fields ---
    preparationSubjectIds: string[];        // multi-select
    preparationDeadline: string | null;     // ISO date

    // --- Rush fields ---
    rushSubjectIds: string[];               // multi-select

    // --- Vacances fields ---
    vacancesObjectif: VacationObjective | null;
    vacancesSubjectIds: string[];           // multi-select
    vacancesDuree: string | null;           // e.g. '1w', '2w', '1m', '2m'
    vacancesPerimetre: LearningScope | null;

    // --- Meta ---
    createdAt: number;                      // timestamp ms
}

export const DUREES = [
    { value: '1w', label: '1 semaine' },
    { value: '2w', label: '2 semaines' },
    { value: '3w', label: '3 semaines' },
    { value: '1m', label: '1 mois' },
    { value: '6w', label: '6 semaines' },
    { value: '2m', label: '2 mois' },
    { value: '3m', label: '3 mois' },
] as const;
