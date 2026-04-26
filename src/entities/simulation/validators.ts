import type { ChatMessage, ErrorEntry } from './types';

function isObject(val: unknown): val is Record<string, unknown> {
    return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function isString(val: unknown): val is string {
    return typeof val === 'string';
}

function isNumber(val: unknown): val is number {
    return typeof val === 'number' && !isNaN(val);
}

function ensureArray(data: unknown): unknown[] {
    if (Array.isArray(data)) return data;
    console.warn('[Med-Pilot Validator] Expected array, got:', typeof data);
    return [];
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
