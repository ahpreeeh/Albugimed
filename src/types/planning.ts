// ─── Planning Types ──────────────────────────────────────────────────
// Types for recurring time slots and planning events.

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
    recurrence?: string; // human-readable description
    sourceSlotId?: string;
}

export interface Deadline {
    id: string;
    date: string;        // ISO date YYYY-MM-DD
    title: string;
    type: "exam" | "cours";
}

// ─── Utilities ───────────────────────────────────────────────────────

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

    /** Get the full day name */
    getDayName(day: number): string {
        return DAY_NAMES_FULL[day] || "";
    },

    /** Get short day name */
    getDayNameShort(day: number): string {
        return DAY_NAMES_SHORT[day] || "";
    },

    /** Format duration as readable string */
    formatDuration(hours: number): string {
        if (hours < 1) return `${Math.round(hours * 60)}min`;
        if (hours % 1 === 0) return `${hours}h`;
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return `${h}h${m.toString().padStart(2, "0")}`;
    },

    /** Calculate end time */
    getEndTime(startTime: string, duration: number): string {
        const [h, m] = startTime.split(":").map(Number);
        const totalMinutes = h * 60 + m + duration * 60;
        const endH = Math.floor(totalMinutes / 60) % 24;
        const endM = Math.round(totalMinutes % 60);
        return `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;
    },

    /** Type labels in French */
    typeLabels: {
        revision: "Révision",
        cours: "Cours",
        exam: "Examen",
        perso: "Personnel",
    } as Record<PlanningEventType, string>,
};
