export interface ChatMessage {
    id: string;
    role: 'user' | 'model' | 'system';
    text: string;
    timestamp: number;
}

export interface ErrorEntry {
    id: string;
    matiere: string;
    question: string;
    erreur_commise: string;
    correction: string;
    date: number;
    isExported?: boolean;
}

export interface Flashcard {
    question: string;
    reponse: string;
}

export interface CapturedErrorPayload {
    matiere?: unknown;
    question?: unknown;
    erreur_commise?: unknown;
    correction?: unknown;
    date?: unknown;
}
