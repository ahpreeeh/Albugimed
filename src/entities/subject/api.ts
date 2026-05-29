// ─── Subject entity — api (façade sur userDataRepository) ───────────
// Couche d'accès cloud pour les subjects. Passe par userDataRepository
// (et non par supabase direct) afin de centraliser la logique d'auth/erreur.
// Dormant en step 2.3 : pas encore câblé à SubjectContext (câblage = step 2.4 / Lot H).

import { userDataRepository } from '@/shared/api/userDataRepository';
import { loadKey } from '@/shared/api/cloudBatchLoader';
import { validateSubjects } from '@/shared/lib/validators';
import { STORAGE_KEYS } from '@/shared/config/storageKeys';
import type { Subject } from './types';

const SUBJECTS_KEY = STORAGE_KEYS.subjects.list;

/**
 * Charge les subjects depuis le cloud.
 *
 * - `null` : pas de valeur cloud pour ce user (ou user non connecté)
 *   → le caller doit conserver son état local au lieu de l'écraser.
 * - `Subject[]` : valeur trouvée, passée par `validateSubjects` (filtre les
 *   entrées corrompues, tolère les anciens formats).
 */
export async function loadSubjects(): Promise<Subject[] | null> {
    const raw = await loadKey<unknown>(SUBJECTS_KEY);
    if (raw === null) {
        return null;
    }
    return validateSubjects(raw);
}

/**
 * Sauvegarde les subjects dans le cloud (fire-and-forget côté caller).
 * Si le user n'est pas connecté, userDataRepository retourne silencieusement
 * — pas d'erreur propagée.
 */
export async function saveSubjects(subjects: Subject[]): Promise<void> {
    await userDataRepository.set(SUBJECTS_KEY, subjects);
}
