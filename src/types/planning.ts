// ─── Backward-compatibility shim ────────────────────────────────────
// La source canonique des types planning vit désormais dans
// `entities/planning/types.ts`. Ce fichier sera supprimé quand tous
// les consommateurs (PlanningView en particulier) seront migrés vers
// la couche entities (Phase 5 Lots Y → AA).
//
// Ne rien ajouter ici — ajouter dans `entities/planning/types.ts`.

export type {
    PlanningEventType,
    RecurrentSlot,
    PlanningEvent,
    Deadline,
    GridItem,
    ModalData,
    ViewMode,
} from "@/entities/planning/types";

export {
    RecurrentSlotUtils,
    START_HOUR,
    END_HOUR,
    TOTAL_HOURS,
    HOUR_HEIGHT,
    GRID_HEIGHT,
    HOURS,
} from "@/entities/planning/types";
