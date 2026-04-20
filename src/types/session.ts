// ─── Backward-compatibility shim ────────────────────────────────────
// La source canonique des types Session vit désormais dans
// `entities/session/types.ts`. Ce fichier est maintenu le temps que la
// Phase 3 migre les consommateurs vers la couche entities, puis sera
// supprimé (comme `types/strategy.ts` l'a été en step 2.10).
//
// Ne rien ajouter ici — ajouter dans `entities/session/types.ts`.

export type {
    SessionTaskType,
    AnnaleLevel,
    SessionReason,
    TaskStatus,
    DifficultyRating,
    SessionTask,
    DailySession,
} from '@/entities/session/types';

export {
    reasonLabel,
    taskTypeLabel,
    reasonBadgeClass,
    difficultyColor,
} from '@/entities/session/types';
