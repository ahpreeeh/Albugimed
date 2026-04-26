import type { ChatMessage, ErrorEntry } from '@/entities/simulation/types';

function isObject(val: unknown): val is Record<string, unknown> {
    return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function isString(val: unknown): val is string {
    return typeof val === 'string';
}

function isBoolean(val: unknown): val is boolean {
    return typeof val === 'boolean';
}

function isNumber(val: unknown): val is number {
    return typeof val === 'number' && !isNaN(val);
}

function ensureArray(data: unknown): unknown[] {
    if (Array.isArray(data)) return data;
    console.warn('[Med-Pilot Validator] Expected array, got:', typeof data);
    return [];
}

interface ChapterStatus {
    t1: boolean;
    annales: boolean;
    t2: boolean;
}

interface ChapterProgress {
    courseStarted: boolean;
    level1Done: boolean;
    reactivationDone: boolean;
    advancedDone: boolean;
    firstSeenDate: string | null;
    lastWorkedDate: string | null;
    lastTrainingDate: string | null;
}

interface Chapter {
    id: string;
    title: string;
    status: ChapterStatus;
    progress: ChapterProgress;
}

interface Subject {
    id: string;
    title: string;
    iconName: string;
    chapters: Chapter[];
    examDate?: string;
}

function isValidChapterStatus(val: unknown): val is ChapterStatus {
    if (!isObject(val)) return false;
    return isBoolean(val.t1) && isBoolean(val.annales) && isBoolean(val.t2);
}

function isValidChapterProgress(val: unknown): val is ChapterProgress {
    if (!isObject(val)) return false;
    return isBoolean(val.courseStarted) && isBoolean(val.level1Done)
        && isBoolean(val.reactivationDone) && isBoolean(val.advancedDone);
}

function deriveProgressFromStatus(status: ChapterStatus): ChapterProgress {
    return {
        courseStarted: status.t1 || false,
        level1Done: status.annales || false,
        reactivationDone: status.t2 || false,
        advancedDone: false,
        firstSeenDate: null,
        lastWorkedDate: null,
        lastTrainingDate: null,
    };
}

function isValidChapter(val: unknown): val is Chapter {
    if (!isObject(val)) return false;
    if (!isString(val.id) || !isString(val.title)) return false;
    if (!isValidChapterStatus(val.status)) {
        (val as Record<string, unknown>).status = { t1: false, annales: false, t2: false };
    }
    if (!isValidChapterProgress(val.progress)) {
        (val as Record<string, unknown>).progress = deriveProgressFromStatus(
            (val as Record<string, unknown>).status as ChapterStatus
        );
    }
    return true;
}

function isValidSubject(val: unknown): val is Subject {
    if (!isObject(val)) return false;
    if (!isString(val.id) || !isString(val.title) || !isString(val.iconName)) return false;
    if (!Array.isArray(val.chapters)) {
        (val as Record<string, unknown>).chapters = [];
        return true;
    }
    (val as Record<string, unknown>).chapters = (val.chapters as unknown[]).filter((ch, i) => {
        const valid = isValidChapter(ch);
        if (!valid) console.warn(`[Med-Pilot Validator] Invalid chapter at index ${i} in subject "${val.title}", skipped`);
        return valid;
    });
    return true;
}

export function validateSubjects(data: unknown): Subject[] {
    const arr = ensureArray(data);
    return arr.filter((item, i) => {
        const valid = isValidSubject(item);
        if (!valid) console.warn(`[Med-Pilot Validator] Invalid subject at index ${i}, skipped`);
        return valid;
    }) as Subject[];
}

interface PlanItem {
    id: string;
    subjectId: string;
    chapterId: string;
    chapterTitle: string;
    subjectTitle: string;
    date: 'today' | 'tomorrow';
    isCompleted: boolean;
}

function isValidPlanItem(val: unknown): val is PlanItem {
    if (!isObject(val)) return false;
    if (!isString(val.id) || !isString(val.subjectId) || !isString(val.chapterId)) return false;
    if (!isString(val.chapterTitle) || !isString(val.subjectTitle)) return false;
    if (val.date !== 'today' && val.date !== 'tomorrow') return false;
    if (!isBoolean(val.isCompleted)) {
        (val as Record<string, unknown>).isCompleted = false;
    }
    return true;
}

export function validatePlanItems(data: unknown): PlanItem[] {
    const arr = ensureArray(data);
    return arr.filter((item, i) => {
        const valid = isValidPlanItem(item);
        if (!valid) console.warn(`[Med-Pilot Validator] Invalid plan item at index ${i}, skipped`);
        return valid;
    }) as PlanItem[];
}

interface AgendaEvent {
    id: string;
    title: string;
    date: string;
    time?: string;
    endTime?: string;
    type?: 'event' | 'task';
}

function isValidEvent(val: unknown): val is AgendaEvent {
    if (!isObject(val)) return false;
    if (!isString(val.id) || !isString(val.title) || !isString(val.date)) return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(val.date as string)) return false;
    return true;
}

export function validateEvents(data: unknown): AgendaEvent[] {
    const arr = ensureArray(data);
    return arr.filter((item, i) => {
        const valid = isValidEvent(item);
        if (!valid) console.warn(`[Med-Pilot Validator] Invalid event at index ${i}, skipped`);
        return valid;
    }) as AgendaEvent[];
}

interface TaskItem {
    id: string;
    text: string;
    completed: boolean;
}

function isValidTask(val: unknown): val is TaskItem {
    if (!isObject(val)) return false;
    if (!isString(val.id) || !isString(val.text)) return false;
    if (!isBoolean(val.completed)) {
        (val as Record<string, unknown>).completed = false;
    }
    return true;
}

export function validateTasks(data: unknown): TaskItem[] {
    const arr = ensureArray(data);
    return arr.filter((item, i) => {
        const valid = isValidTask(item);
        if (!valid) console.warn(`[Med-Pilot Validator] Invalid task at index ${i}, skipped`);
        return valid;
    }) as TaskItem[];
}

interface RevisionEntry {
    id: string;
    date: string;
    type: 'cours' | 'dp';
    title: string;
    timestamp: number;
}

function isValidRevisionEntry(val: unknown): val is RevisionEntry {
    if (!isObject(val)) return false;
    if (!isString(val.id) || !isString(val.date) || !isString(val.title)) return false;
    if (val.type !== 'cours' && val.type !== 'dp') return false;
    if (!isNumber(val.timestamp)) {
        (val as Record<string, unknown>).timestamp = Date.now();
    }
    return true;
}

export function validateRevisionEntries(data: unknown): RevisionEntry[] {
    const arr = ensureArray(data);
    return arr.filter((item, i) => {
        const valid = isValidRevisionEntry(item);
        if (!valid) console.warn(`[Med-Pilot Validator] Invalid revision entry at index ${i}, skipped`);
        return valid;
    }) as RevisionEntry[];
}

function isValidChatMessage(val: unknown): val is ChatMessage {
    if (!isObject(val)) return false;
    if (!isString(val.id) || !isString(val.text)) return false;
    if (val.role !== 'user' && val.role !== 'model' && val.role !== 'system') return false;
    if (!isNumber(val.timestamp)) {
        (val as Record<string, unknown>).timestamp = Date.now();
    }
    return true;
}

export function validateChatMessages(data: unknown): ChatMessage[] {
    const arr = ensureArray(data);
    return arr.filter((item, i) => {
        const valid = isValidChatMessage(item);
        if (!valid) console.warn(`[Med-Pilot Validator] Invalid chat message at index ${i}, skipped`);
        return valid;
    }) as ChatMessage[];
}

function isValidErrorEntry(val: unknown): val is ErrorEntry {
    if (!isObject(val)) return false;
    if (!isString(val.id) || !isString(val.matiere) || !isString(val.question)) return false;
    if (!isString(val.erreur_commise) || !isString(val.correction)) return false;
    if (!isNumber(val.date)) {
        (val as Record<string, unknown>).date = Date.now();
    }
    return true;
}

export function validateErrorBank(data: unknown): ErrorEntry[] {
    const arr = ensureArray(data);
    return arr.filter((item, i) => {
        const valid = isValidErrorEntry(item);
        if (!valid) console.warn(`[Med-Pilot Validator] Invalid error entry at index ${i}, skipped`);
        return valid;
    }) as ErrorEntry[];
}

export function safeParseJSON<T>(raw: string | null, validator: (data: unknown) => T[], label: string): T[] {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return validator(parsed);
    } catch (e) {
        console.error(`[Med-Pilot Validator] Failed to parse ${label}:`, e);
        return [];
    }
}
