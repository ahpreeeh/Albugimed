"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, RefreshCw, Bot, AlertTriangle, Settings, Maximize2, Minimize2, Lock } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { ChatMessage, ErrorEntry } from '@/entities/simulation/types';
import { validateChatMessages, validateErrorBank } from '@/entities/simulation/validators';
import { useGeminiConfig } from '@/entities/simulation/useGeminiConfig';
import { loadChatHistory, saveChatHistory, saveErrorBank } from '@/entities/simulation/api';
import { askGemini, buildGeminiHistory } from '@/entities/simulation/gemini';
import { extractErrorCapture } from '@/entities/simulation/model';
import { ChatMessageBubble } from './ChatMessageBubble';

const WELCOME_MSG = "Bonjour Docteur. Quel dossier voulez-vous traiter aujourd'hui (Matière) et à quel niveau de difficulté (0 à 4) ?";
const INACTIVITY_THRESHOLD = 2 * 60 * 60 * 1000;

interface SimulatorChatProps {
    onErrorCaptured?: () => void;
}

export const SimulatorChat = ({ onErrorCaptured }: SimulatorChatProps) => {
    const { apiKey, modelId: cloudModelId, isLoaded: configLoaded, isLoggedIn, saveConfig } = useGeminiConfig();
    const [localApiKey, setLocalApiKey]       = useState("");
    const [localModelId, setLocalModelId]     = useState("");
    const [isConfigOpen, setIsConfigOpen]     = useState(false);
    const [messages, setMessages]             = useState<ChatMessage[]>([]);
    const [input, setInput]                   = useState("");
    const [isLoading, setIsLoading]           = useState(false);
    const [isFullScreen, setIsFullScreen]     = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const historyHydratedRef = useRef(false);
    const historyMutationVersionRef = useRef(0);

    // Synchroniser les champs du formulaire config avec les valeurs cloud
    useEffect(() => {
        if (configLoaded) {
            setLocalApiKey(apiKey);
            setLocalModelId(cloudModelId);
        }
    }, [configLoaded, apiKey, cloudModelId]);

    // Charger l'historique local immédiatement, puis réconcilier avec le cloud.
    useEffect(() => {
        const fallback = [{ id: 'welcome', role: 'model' as const, text: WELCOME_MSG, timestamp: Date.now() }];
        let cancelled = false;
        const initialMutationVersion = historyMutationVersionRef.current;
        const storedHistory = localStorage.getItem('dp_chat_history');
        if (storedHistory) {
            try {
                const validated = validateChatMessages(JSON.parse(storedHistory));
                setMessages(validated.length > 0 ? validated : fallback);
            } catch {
                setMessages(fallback);
            }
        } else {
            setMessages(fallback);
        }

        loadChatHistory().then((cloudHistory) => {
            if (
                cancelled
                || cloudHistory.length === 0
                || historyMutationVersionRef.current !== initialMutationVersion
            ) {
                return;
            }
            setMessages(cloudHistory);
            localStorage.setItem('dp_chat_history', JSON.stringify(cloudHistory));
        }).catch(error => {
            console.warn('[SimulatorChat] Chargement cloud échoué', error);
        }).finally(() => {
            if (!cancelled) {
                historyHydratedRef.current = true;
            }
        });

        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        if (messages.length > 0 && messages.some(m => m.role === 'user' || m.role === 'model')) {
            localStorage.setItem('dp_chat_history', JSON.stringify(messages));
            if (!historyHydratedRef.current) {
                return;
            }
            saveChatHistory(messages).catch(error => {
                console.warn('[SimulatorChat] Sauvegarde cloud échouée', error);
            });
        }
    }, [messages]);

    const handleSaveConfig = async () => {
        const ok = await saveConfig(localApiKey, localModelId);
        if (!ok) {
            alert("Impossible de sauvegarder : vous devez être connecté.");
            return;
        }
        setIsConfigOpen(false);
    };

    const startNewSession = () => {
        if (confirm("Voulez-vous vraiment commencer une nouvelle session ? L'historique actuel sera effacé.")) {
            historyMutationVersionRef.current += 1;
            localStorage.removeItem('dp_chat_history');
            setMessages([{
                id: crypto.randomUUID(), role: 'model',
                text: "Session réinitialisée. " + WELCOME_MSG,
                timestamp: Date.now()
            }]);
        }
    };

    const extractAndSaveErrors = useCallback((text: string): string => {
        let existingErrors: ErrorEntry[] = [];
        try {
            existingErrors = validateErrorBank(JSON.parse(localStorage.getItem('med-pilot-error-bank') || '[]'));
        } catch { /* start fresh */ }

        const result = extractErrorCapture(text, existingErrors, {
            onParseError: error => console.error("Failed to parse captured error JSON", error),
        });

        if (result.capturedErrors.length > 0) {
            localStorage.setItem('med-pilot-error-bank', JSON.stringify(result.errors));
            saveErrorBank(result.errors).catch(error => {
                console.warn('[SimulatorChat] Sauvegarde erreurs cloud échouée', error);
            });
            onErrorCaptured?.();
        }

        return result.cleanText;
    }, [onErrorCaptured]);
    const sendMessage = async () => {
        if (!input.trim()) return;
        if (!apiKey) {
            alert("Veuillez configurer votre clé API Gemini d'abord.");
            setIsConfigOpen(true);
            return;
        }

        // Session detection
        const lastMessageTime = localStorage.getItem('dp_last_message_time');
        const now = Date.now();
        if (!lastMessageTime || (now - parseInt(lastMessageTime)) > INACTIVITY_THRESHOLD) {
            // Could add revision history entry here
        }
        localStorage.setItem('dp_last_message_time', now.toString());

        const newUserMessage: ChatMessage = {
            id: crypto.randomUUID(), role: 'user', text: input, timestamp: Date.now()
        };
        historyMutationVersionRef.current += 1;
        setMessages(prev => [...prev, newUserMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const rawText = await askGemini({
                apiKey,
                modelId: cloudModelId || "gemini-2.5-flash",
                prompt: input,
                history: buildGeminiHistory(messages),
            });

            if (!rawText || rawText.trim().length === 0) {
                setMessages(prev => [...prev, {
                    id: crypto.randomUUID(), role: 'system',
                    text: "L'IA a renvoyé une réponse vide. Cela peut être dû à un filtre de sécurité. Réessayez.",
                    timestamp: Date.now()
                }]);
                return;
            }

            const cleanText = extractAndSaveErrors(rawText);
            setMessages(prev => [...prev, {
                id: crypto.randomUUID(), role: 'model', text: cleanText, timestamp: Date.now()
            }]);
        } catch (error: unknown) {
            const errorStr = String((error as Error)?.message || error || '');
            let errorText = "Erreur de connexion à l'IA.";
            if (errorStr.includes('401') || errorStr.includes('403')) errorText += " (Clé API invalide)";
            else if (errorStr.includes('404')) errorText += ` (Modèle introuvable : « ${localModelId || "gemini-2.5-flash"} »)`;
            else if (errorStr.includes('429')) errorText += " (Trop de requêtes — Attendez)";
            else if (errorStr.includes('SAFETY') || errorStr.includes('blocked')) errorText += " (Bloqué par filtres de sécurité)";
            else if (errorStr.includes('Failed to fetch') || errorStr.includes('network')) errorText += " (Problème réseau)";
            else errorText += ` Détail : ${errorStr.slice(0, 150)}`;

            setMessages(prev => [...prev, {
                id: crypto.randomUUID(), role: 'system', text: errorText, timestamp: Date.now()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    };

    return (
        <div className={cn(
            "flex flex-col overflow-hidden bg-[var(--color-bg-card)] border border-[var(--color-border-default)] transition-all duration-300",
            isFullScreen
                ? "fixed inset-0 z-[9999] h-screen w-screen rounded-none"
                : "relative h-full rounded-xl"
        )}>
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border-default)] px-4 py-3">
                <div className="flex items-center gap-2.5">
                    <div className="app-icon-box"><Bot className="w-4 h-4" /></div>
                    <div>
                        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Simulateur EDN</h2>
                        <p className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1.5">
                            {cloudModelId || "Gemini 2.5 Flash"}
                            {!isLoggedIn && <span className="text-amber-400 flex items-center gap-0.5"><Lock className="w-2.5 h-2.5" /> Connexion requise</span>}
                            {isLoggedIn && !apiKey && <span className="text-amber-400 flex items-center gap-0.5"><AlertTriangle className="w-2.5 h-2.5" /> Clé manquante</span>}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => setIsConfigOpen(!isConfigOpen)}
                        className={cn("h-8 w-8 flex items-center justify-center rounded-lg transition-colors",
                            apiKey ? "text-[var(--color-text-muted)] hover:text-[var(--color-accent)]" : "bg-amber-400/10 text-amber-400"
                        )}>
                        <Settings className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={startNewSession} className="h-8 w-8 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-accent)]">
                        <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    {isFullScreen ? (
                        <button onClick={() => setIsFullScreen(false)} className="h-8 w-8 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-accent)]" title="Quitter le plein écran">
                            <Minimize2 className="w-3.5 h-3.5" />
                        </button>
                    ) : (
                        <button onClick={() => setIsFullScreen(true)} className="h-8 w-8 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-accent)]">
                            <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Config */}
            {isConfigOpen && (
                <div className="space-y-3 border-b border-[var(--color-border-default)] bg-[var(--color-bg-tertiary)] px-4 py-4">
                    {!isLoggedIn ? (
                        <p className="text-xs text-amber-400 flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5" />
                            Connectez-vous pour configurer votre clé API. Elle sera stockée de façon sécurisée dans votre compte.
                        </p>
                    ) : (
                        <>
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)] mb-1 block">Clé API Gemini</label>
                                <input type="password" value={localApiKey} onChange={e => setLocalApiKey(e.target.value)} className="app-input w-full text-xs" placeholder="Collez votre clé API..." />
                                <p className="text-[9px] text-[var(--color-text-hint)] mt-1">🔒 Stockée dans votre compte Supabase, jamais en local.</p>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)] mb-1 block">Modèle (optionnel)</label>
                                <input type="text" value={localModelId} onChange={e => setLocalModelId(e.target.value)} className="app-input w-full text-xs" placeholder="gemini-2.5-flash" />
                            </div>
                            <button onClick={handleSaveConfig} className="app-btn-primary text-xs w-full">Sauvegarder</button>
                        </>
                    )}
                </div>
            )}

            {/* Messages */}
            <div className={cn(
                "flex-1 overflow-y-auto space-y-5",
                isFullScreen ? "px-8 py-6" : "p-4"
            )}>
                <div className={cn("mx-auto", isFullScreen ? "max-w-4xl" : "max-w-3xl")}>
                    {messages.map(msg => (
                        <ChatMessageBubble key={msg.id} message={msg} />
                    ))}
                    {isLoading && (
                        <div className="flex gap-3 mb-5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--color-border-default)] bg-[var(--color-bg-tertiary)]">
                                <Bot className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
                            </div>
                            <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-[var(--color-border-default)] bg-[var(--color-bg-card)] px-4 py-3">
                                <span className="h-2 w-2 rounded-full bg-[var(--color-accent)] animate-bounce" />
                                <span className="h-2 w-2 rounded-full bg-[var(--color-accent)] animate-bounce [animation-delay:150ms]" />
                                <span className="h-2 w-2 rounded-full bg-[var(--color-accent)] animate-bounce [animation-delay:300ms]" />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input */}
            <div className={cn(
                "border-t border-[var(--color-border-default)] bg-[var(--color-bg-tertiary)]",
                isFullScreen ? "px-8 py-4" : "p-3"
            )}>
                <div className={cn("flex gap-2 mx-auto", isFullScreen ? "max-w-4xl" : "max-w-3xl")}>
                    <input
                        type="text" value={input} onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Répondez au cas clinique..."
                        className={cn("app-input flex-1", isFullScreen ? "text-base py-3 px-4" : "text-sm")}
                        disabled={isLoading}
                    />
                    <button onClick={sendMessage} disabled={isLoading || !input.trim()}
                        className={cn(
                            "flex items-center justify-center rounded-lg border border-[var(--color-accent)] bg-[var(--color-accent)] text-white disabled:opacity-40 transition-all hover:opacity-90",
                            isFullScreen ? "px-5 py-3" : "px-3"
                        )}>
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
