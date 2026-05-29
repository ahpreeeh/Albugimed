// ─── Session entity — api (façade sur userDataRepository) ────────────
// Couche d'accès cloud pour la session quotidienne et l'historique.
// Passe par userDataRepository pour centraliser auth + gestion d'erreur.
//
// Dormant en step 3.4 (Lot N) : pas encore câblé à SessionEngineContext
// (câblage = step 3.7 / Lot Q, flip-switch avec smoke obligatoire).

import { userDataRepository } from '@/shared/api/userDataRepository';
import { loadKey } from '@/shared/api/cloudBatchLoader';
import { STORAGE_KEYS } from '@/shared/config/storageKeys';
import type { DailySession, SessionHistoryEntry } from './types';

const SESSION_KEY = STORAGE_KEYS.session.daily;
const HISTORY_KEY = STORAGE_KEYS.session.history;

/** Nombre maximum d'entrées historiques conservées (alignement avec L440). */
export const SESSION_HISTORY_MAX = 500;

// ─── Daily session ───────────────────────────────────────────────────

/**
 * Charge la session quotidienne depuis le cloud.
 *
 * - `null` : aucune session cloud (ou user non connecté)
 * - `DailySession` : valeur brute — le filtrage "date === today" reste
 *   de la responsabilité du caller (store / context), car la règle métier
 *   "on ne restaure que la session du jour" peut évoluer indépendamment
 *   de la persistance.
 */
export async function loadDailySession(): Promise<DailySession | null> {
    return loadKey<DailySession>(SESSION_KEY);
}

/**
 * Persiste la session quotidienne dans le cloud.
 * Si le user n'est pas connecté, userDataRepository retourne silencieusement.
 */
export async function saveDailySession(session: DailySession): Promise<void> {
    await userDataRepository.set(SESSION_KEY, session);
}

/**
 * Supprime la session cloud (ex : changement de jour, reset manuel).
 */
export async function clearDailySession(): Promise<void> {
    await userDataRepository.remove(SESSION_KEY);
}

// ─── History ─────────────────────────────────────────────────────────

/**
 * Charge l'historique des tâches complétées.
 * Retourne `[]` si aucune valeur cloud (ou user non connecté, ou format
 * invalide). L'historique est toujours garantit être un tableau pour les
 * consommateurs.
 */
export async function loadSessionHistory(): Promise<SessionHistoryEntry[]> {
    const raw = await loadKey<SessionHistoryEntry[]>(HISTORY_KEY);
    return Array.isArray(raw) ? raw : [];
}

/**
 * Append une entrée à l'historique existant et persiste la liste résultante.
 * Préserve le comportement de SessionEngineContext L440 : cap à 500 entrées
 * (`.slice(-SESSION_HISTORY_MAX)` = les N dernières).
 *
 * Le caller passe l'historique courant en mémoire — ce module ne refait
 * pas de load implicite (pour rester sans couplage caché avec le cloud).
 *
 * @returns le nouvel historique (utile pour mettre à jour le state local).
 */
export async function appendSessionHistory(
    current: readonly SessionHistoryEntry[],
    entry: SessionHistoryEntry,
    maxSize: number = SESSION_HISTORY_MAX,
): Promise<SessionHistoryEntry[]> {
    const next = [...current, entry].slice(-maxSize);
    await userDataRepository.set(HISTORY_KEY, next);
    return next;
}
