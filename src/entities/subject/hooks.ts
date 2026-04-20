// ─── Subject entity — hooks (façade publique) ──────────────────────
// Point d'entrée canonique pour les consommateurs React. Ré-exporte les
// hooks/provider/icônes de SubjectContext et les types depuis entities/subject/types.
//
// Pourquoi une façade plutôt qu'un re-branchage direct ?
//  - Permet de migrer SubjectContext.tsx vers un store Zustand plus tard
//    sans toucher les 13 consommateurs.
//  - Découple les imports UI du chemin d'implémentation (règle FSD :
//    app/features pointent vers entities/*, pas vers src/context/*).
//
// Step 2.6 : find-and-replace des imports de '@/context/SubjectContext'
// vers '@/entities/subject/hooks'. Le Context reste la source réelle
// jusqu'au jour où on migre vers Zustand (hors scope Phase 2).

export {
    useSubjects,
    SubjectProvider,
    ICON_MAP,
    AVAILABLE_ICONS,
    getIconComponent,
} from '@/context/SubjectContext';

export type {
    Subject,
    Chapter,
    ChapterStatus,
    ChapterProgress,
} from '@/entities/subject/types';
