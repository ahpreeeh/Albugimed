// ─── Planning entity — types ─────────────────────────────────────────
// Source canonique des types planning (Phase 5, step 5.1).
// `src/types/planning.ts` reste un re-export de compatibilité tant que
// la migration des consommateurs n'est pas terminée (Phase 5 Lot Z+).

export type PlanningEventType = "revision" | "cours" | "exam" | "perso";

export interface RecurrentSlot {
    id: string;
    title: string;
    type: PlanningEventType;
    daysOfWeek: number[]; // 0=Dimanche, 1=Lundi, ..., 6=Samedi
    startTime: string;    // "HH:mm"
    duration: number;     // heures (ex: 1.5)
    isActive: boolean;
    description?: string;
    createdAt: string;    // ISO date string
}

export interface PlanningEvent {
    id: string;
    title: string;
    type: PlanningEventType;
    date: string;        // ISO date YYYY-MM-DD
    startTime: string;   // "HH:mm"
    duration: number;    // heures
    isRecurrent?: boolean;
    recurrence?: string;
    sourceSlotId?: string;
}

export interface Deadline {
    id: string;
    date: string;        // ISO date YYYY-MM-DD
    title: string;
    type: "exam" | "cours";
}

// ─── Grid view types (week mode) ──────────────────────────────────────
// Utilisés par features/planning-grid/ pour positionner les blocs dans
// la grille horaire.

export interface GridItem {
    id: string;
    originalId: string;
    title: string;
    date: string;
    startTime: string; // HH:MM
    endTime: string;   // HH:MM
    isDefault: boolean;
    source: 'plan' | 'event';
    type: 'event' | 'task' | PlanningEventType;
    isCompleted?: boolean;
    subjectTitle?: string;
    // Layout (computed)
    top: number;
    height: number;
    left: number;    // fraction 0–1
    width: number;   // fraction 0–1
}

export interface ModalData {
    mode: 'create' | 'edit';
    date: string;
    startTime: string;
    endTime: string;
    title: string;
    type: 'event' | 'task';
    editId?: string;
}

/** Mode d'affichage du planning. */
export type ViewMode = "week" | "recurrent" | "calendar";

// ─── Constants ───────────────────────────────────────────────────────
// Configuration de la grille horaire (week mode).

export const START_HOUR = 6;
export const END_HOUR = 23;
export const TOTAL_HOURS = END_HOUR - START_HOUR; // 17
export const HOUR_HEIGHT = 60;                    // px par heure
export const GRID_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT;
export const HOURS = Array.from({ length: TOTAL_HOURS }, (_, i) => i + START_HOUR);

// ─── Display helpers (formatting glue, no logic métier) ───────────────

const DAY_NAMES_SHORT = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const DAY_NAMES_FULL = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

export const RecurrentSlotUtils = {
    /** Human-readable recurrence description */
    getRecurrenceDescription(daysOfWeek: number[]): string {
        if (daysOfWeek.length === 7) return "Tous les jours";
        if (daysOfWeek.length === 5 &&
            [1, 2, 3, 4, 5].every(d => daysOfWeek.includes(d))) {
            return "En semaine";
        }
        if (daysOfWeek.length === 2 &&
            [0, 6].every(d => daysOfWeek.includes(d))) {
            return "Week-end";
        }
        return daysOfWeek
            .sort((a, b) => a - b)
            .map(d => DAY_NAMES_SHORT[d])
            .join(", ");
    },

    getDayName(day: number): string {
        return DAY_NAMES_FULL[day] || "";
    },

    getDayNameShort(day: number): string {
        return DAY_NAMES_SHORT[day] || "";
    },

    formatDuration(hours: number): string {
        if (hours < 1) return `${Math.round(hours * 60)}min`;
        if (hours % 1 === 0) return `${hours}h`;
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return `${h}h${m.toString().padStart(2, "0")}`;
    },

    /** End time = startTime + duration (hours). HH:MM string. */
    getEndTime(startTime: string, duration: number): string {
        const [h, m] = startTime.split(":").map(Number);
        const totalMinutes = h * 60 + m + duration * 60;
        const endH = Math.floor(totalMinutes / 60) % 24;
        const endM = Math.round(totalMinutes % 60);
        return `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;
    },

    typeLabels: {
        revision: "Révision",
        cours: "Cours",
        exam: "Examen",
        perso: "Personnel",
    } as Record<PlanningEventType, string>,
};
