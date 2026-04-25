// ─── Planning entity — pure logic ─────────────────────────────────────
// Fonctions pures extraites de `src/components/views/PlanningView.tsx`
// (Phase 5, step 5.2). Aucune dépendance React/DOM/storage — 100 %
// testable. Les fonctions qui utilisent `Date.now()` ou `new Date()`
// acceptent un timestamp injectable pour le déterminisme des tests.
//
// Depuis les Lots Y → AA, les features Planning consomment directement ces
// helpers au lieu de copies inline dans l'ancienne PlanningView.

import * as chrono from 'chrono-node';
import type { GridItem } from './types';
import { START_HOUR, END_HOUR, HOUR_HEIGHT } from './types';

// ─── Date utilities ───────────────────────────────────────────────────

/** Format a Date as ISO YYYY-MM-DD using local timezone components. */
export function toISODate(d: Date): string {
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/** Add `n` days to a date, returning a new Date. */
export function addDays(d: Date, n: number): Date {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
}

/**
 * Format a 7-day range starting from `start` as a French string.
 * Examples:
 *   "20 au 26 avril 2026"
 *   "29 avril au 5 mai 2026"
 */
export function formatWeekRange(start: Date): string {
    const end = addDays(start, 6);
    const months = [
        'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
        'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
    ];
    const sameMonth = start.getMonth() === end.getMonth();
    if (sameMonth) {
        return `${start.getDate()} au ${end.getDate()} ${months[start.getMonth()]} ${start.getFullYear()}`;
    }
    return `${start.getDate()} ${months[start.getMonth()]} au ${end.getDate()} ${months[end.getMonth()]} ${end.getFullYear()}`;
}

// ─── Time arithmetic (HH:MM ↔ minutes) ────────────────────────────────

/** Convert "HH:MM" to absolute minutes from 00:00. Tolérant aux secondes manquantes. */
export function timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + (m || 0);
}

/** Convert absolute minutes to "HH:MM" (24h, zero-padded). */
export function minutesToTime(mins: number): string {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Vertical offset (px) for an event starting at `time`, relative to the
 * grid's START_HOUR. Negative if before START_HOUR.
 */
export function timeToTop(time: string): number {
    const mins = timeToMinutes(time);
    return ((mins / 60) - START_HOUR) * HOUR_HEIGHT;
}

/**
 * Pixel height for an event spanning [start, end].
 * Minimum height: 20px (lisibilité visuelle).
 */
export function durationToHeight(start: string, end: string): number {
    const startMins = timeToMinutes(start);
    const endMins = timeToMinutes(end);
    return Math.max(((endMins - startMins) / 60) * HOUR_HEIGHT, 20);
}

/**
 * Add `hours` (default 1) to `time`, capped at END_HOUR.
 * Used for "default duration" when creating an event.
 */
export function addHourHelper(time: string, hours: number = 1): string {
    const mins = timeToMinutes(time) + hours * 60;
    return minutesToTime(Math.min(mins, END_HOUR * 60));
}

// ─── Overlap layout (4-column algorithm) ──────────────────────────────

/**
 * Place items in up to 4 columns side by side based on time overlaps.
 *
 * Algo :
 *  1. Trie les items par heure de début ascendante.
 *  2. Pour chaque item, tente de le placer dans la première colonne où
 *     le dernier item se termine avant le début du nouveau (≤).
 *  3. Si aucune colonne libre dans les 4 premières, ouvre une nouvelle
 *     colonne (max 4) ou empile dans la colonne 0 en débordement.
 *  4. Calcule `left` (offset 0-1) et `width` (largeur 0-1) en fonction
 *     du nombre total de colonnes utilisées (max 4).
 *
 * Préserve `top` et `height` calculés en amont.
 */
export function layoutOverlaps(items: GridItem[]): GridItem[] {
    if (items.length === 0) return [];
    const sorted = [...items].sort(
        (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime),
    );
    const columns: GridItem[][] = [];

    for (const item of sorted) {
        const itemStart = timeToMinutes(item.startTime);

        let placed = false;
        for (let c = 0; c < columns.length && c < 4; c++) {
            const lastInCol = columns[c][columns[c].length - 1];
            if (timeToMinutes(lastInCol.endTime) <= itemStart) {
                columns[c].push(item);
                placed = true;
                break;
            }
        }
        if (!placed) {
            if (columns.length < 4) {
                columns.push([item]);
            } else {
                // Débordement : empile dans la première colonne
                columns[0].push(item);
            }
        }
    }

    const totalCols = Math.min(columns.length, 4);
    const result: GridItem[] = [];

    columns.forEach((col, colIndex) => {
        col.forEach(item => {
            result.push({
                ...item,
                left: colIndex / totalCols,
                width: 1 / totalCols,
            });
        });
    });

    return result;
}

// ─── NLP parser (chrono-node, French) ─────────────────────────────────

export interface ParsedNLPInput {
    /** Title with date/time text removed. */
    title: string;
    /** YYYY-MM-DD or null if chrono didn't find a date. */
    date: string | null;
    /** "HH:MM" or undefined if no time was specified. */
    time?: string;
}

/**
 * Parse a French natural-language input into title + date + optional time.
 *
 * Examples (when `referenceDate` is undefined, uses Date.now()):
 *   "Révision cardio demain 14h"  →  {title:"Révision cardio", date:"<tomorrow>", time:"14:00"}
 *   "Examen le 5 mai"             →  {title:"Examen", date:"<2026-05-05>"}
 *   "Pause"                        →  {title:"Pause", date: null}
 *
 * `forwardDate: true` : si chrono est ambigu, projette vers le futur
 * (ex : "lundi" sans "prochain" → lundi prochain et non le passé).
 */
export function parseNLPInput(
    input: string,
    referenceDate: Date = new Date(),
): ParsedNLPInput {
    const results = chrono.fr.parse(input, referenceDate, { forwardDate: true });

    if (results.length > 0) {
        const result = results[0];
        const date = result.start.date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

        let time: string | undefined;
        if (result.start.isCertain('hour')) {
            const hh = pad(result.start.get('hour') ?? 0);
            const mm = pad(result.start.get('minute') ?? 0);
            time = `${hh}:${mm}`;
        }

        // Retire la partie date/heure du texte pour isoler le titre
        let title = input.replace(result.text, '').trim();
        title = title.replace(/^[\s,:-]+|[\s,:-]+$/g, '').replace(/\s+/g, ' ');
        if (!title) title = input.trim();

        return { title, date: dateStr, time };
    }

    // Pas de date trouvée → titre = input brut, date = null
    return { title: input.trim(), date: null };
}
