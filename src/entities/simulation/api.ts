import { userDataRepository } from '@/shared/api/userDataRepository';
import { STORAGE_KEYS } from '@/shared/config/storageKeys';
import { validateChatMessages, validateErrorBank } from '@/shared/lib/validators';
import type { ChatMessage, ErrorEntry } from './types';

const ERROR_BANK_KEY = STORAGE_KEYS.simulation.errorBank;
const CHAT_HISTORY_KEY = STORAGE_KEYS.chat.history;

export async function loadErrorBank(): Promise<ErrorEntry[]> {
    const raw = await userDataRepository.get<unknown>(ERROR_BANK_KEY);
    return validateErrorBank(raw);
}

export async function saveErrorBank(errors: ErrorEntry[]): Promise<void> {
    await userDataRepository.set(ERROR_BANK_KEY, errors);
}

export async function loadChatHistory(): Promise<ChatMessage[]> {
    const raw = await userDataRepository.get<unknown>(CHAT_HISTORY_KEY);
    return validateChatMessages(raw);
}

export async function saveChatHistory(messages: ChatMessage[]): Promise<void> {
    await userDataRepository.set(CHAT_HISTORY_KEY, messages);
}
