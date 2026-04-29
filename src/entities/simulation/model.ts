import type { CapturedErrorPayload, ErrorEntry, Flashcard } from './types';

const CAPTURE_ERROR_PATTERN = /\[CAPTURE_ERREUR\]([\s\S]*?)\[\/CAPTURE_ERREUR\]/g;

interface ExtractErrorCaptureOptions {
    createId?: () => string;
    now?: () => number;
    onParseError?: (error: unknown) => void;
}

interface ExtractErrorCaptureResult {
    cleanText: string;
    errors: ErrorEntry[];
    capturedErrors: ErrorEntry[];
}

function defaultCreateId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readString(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.trim() ? value : fallback;
}

function makeErrorEntry(
    payload: CapturedErrorPayload,
    createId: () => string,
    now: () => number,
): ErrorEntry {
    return {
        id: createId(),
        matiere: readString(payload.matiere, 'Non classé'),
        question: readString(payload.question, 'Question inconnue'),
        erreur_commise: readString(payload.erreur_commise, 'Erreur non spécifiée'),
        correction: readString(payload.correction, 'Voir débriefing'),
        date: now(),
        isExported: false,
    };
}

export function extractErrorCapture(
    text: string,
    existingErrors: readonly ErrorEntry[] = [],
    options: ExtractErrorCaptureOptions = {},
): ExtractErrorCaptureResult {
    const createId = options.createId ?? defaultCreateId;
    const now = options.now ?? Date.now;
    const capturedErrors: ErrorEntry[] = [];
    let errors = [...existingErrors];

    const captureRegex = new RegExp(CAPTURE_ERROR_PATTERN);
    let match: RegExpExecArray | null;

    while ((match = captureRegex.exec(text)) !== null) {
        try {
            const payload = JSON.parse(match[1]) as CapturedErrorPayload;
            const isDuplicate = errors.some(error =>
                error.matiere === payload.matiere && error.question === payload.question
            );

            if (!isDuplicate) {
                const entry = makeErrorEntry(payload, createId, now);
                errors = [entry, ...errors];
                capturedErrors.push(entry);
            }
        } catch (error) {
            options.onParseError?.(error);
        }
    }

    return {
        cleanText: text.replace(CAPTURE_ERROR_PATTERN, '').trim(),
        errors,
        capturedErrors,
    };
}

function sanitizeTsvField(value: string): string {
    return value.replace(/\t/g, ' ').replace(/\r?\n/g, ' ').trim();
}

export function buildAnkiTsv(flashcards: readonly Flashcard[]): string {
    if (flashcards.length === 0) return '';
    return flashcards
        .map(card => `${sanitizeTsvField(card.question)}\t${sanitizeTsvField(card.reponse)}`)
        .join('\r\n') + '\r\n';
}
