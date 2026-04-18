// ─── Subject entity — types ──────────────────────────────────────────
// Extrait depuis `src/context/SubjectContext.tsx` L17-50 (step 2.1 Phase 2).
// Les types sont ré-exportés depuis `SubjectContext.tsx` pour BC jusqu'à Lot I (step 2.6).

export interface ChapterStatus {
    t1: boolean;
    annales: boolean;
    t2: boolean;
}

export interface ChapterProgress {
    courseStarted: boolean;
    level1Done: boolean;
    reactivationDone: boolean;
    advancedDone: boolean;
    firstSeenDate: string | null;
    lastWorkedDate: string | null;
    lastTrainingDate: string | null;
    lastReviewDifficulty?: 'red' | 'orange' | 'green' | 'blue';
    nextReviewDate?: string | null;
}

export interface Chapter {
    id: string;
    title: string;
    status: ChapterStatus;
    progress: ChapterProgress;
}

export interface Subject {
    id: string;
    title: string;
    iconName: string;
    chapters: Chapter[];
    examDate?: string;
    year?: string;
    semester?: string;
}
