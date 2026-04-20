// ─── Strategy Types — BC re-export ───────────────────────────────
// Cette source est une façade de compat. Les types, constantes et
// helpers vivent désormais dans entities/strategy/*.
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
export { createEmptyStrategy } from '@/entities/strategy/model';
