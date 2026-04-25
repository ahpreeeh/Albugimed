export type { Subject, Chapter, ChapterStatus, ChapterProgress } from '@/entities/subject/hooks';

export type { ChatMessage, ErrorEntry, Flashcard } from '@/entities/simulation/types';

export interface MedPilotBackup {
    version: number;
    exportDate: string;
    appVersion: string;
    data: {
        subjects: unknown[];
        planItems: unknown[];
        lastRefreshDate: string | null;
        events: unknown[];
        tasks: unknown[];
        revisionHistory: unknown[];
        chatHistory: unknown[];
        errorBank: unknown[];
        settings: {
            geminiModel: string | null;
            lastMessageTime: string | null;
        };
    };
}

export interface ImportResult {
    success: boolean;
    warnings: string[];
    counts: {
        subjects: number;
        planItems: number;
        events: number;
        tasks: number;
        revisionHistory: number;
        chatHistory: number;
        errorBank: number;
    };
}
