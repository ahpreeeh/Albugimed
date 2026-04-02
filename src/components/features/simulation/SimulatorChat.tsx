"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, RefreshCw, Bot, User, AlertTriangle, Settings, Maximize2, Minimize2, Lock } from 'lucide-react';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import type { ChatMessage, ErrorEntry } from '@/types';
import { validateChatMessages, validateErrorBank } from '@/lib/validators';
import { useGeminiConfig } from '@/hooks/useGeminiConfig';
import { createClient } from '@/utils/supabase/client';

// --- System Prompt — COPIE FIDÈLE ---
const DP_SYSTEM_INSTRUCTIONS = `
RÔLE : Tu es un expert en pédagogie médicale EDN/ECOS et en simulation de dossiers progressifs.
MODE DE FONCTIONNEMENT (OBLIGATOIRE) :
Séquentiel verrouillé. Ne jamais dévoiler la suite avant la réponse de l'utilisateur.

Structure du DP :
1. Introduction clinique réaliste.
2. 3 à 6 étapes progressives.
3. 2 à 4 questions par étape.
4. Correction argumentée après CHAQUE étape (Réponse attendue, Justification, Gravité de l'erreur).
5. Débrief final global.

SYSTÈME DE NIVEAUX (À respecter scrupuleusement) :
- Niveau 0 (Typique) : Clinique classique, Biologie attendue, CAT standard. Aucune ambiguïté.
- Niveau 1 (Monothématique) : Pathologie claire, 1 différentiel crédible.
- Niveau 2 (Transversal Modéré) : 2 systèmes impliqués, 1 donnée parasite.
- Niveau 3 (Transversal Avancé) : Comorbidités, Médicaments interférents, Urgence.
- Niveau 4 (EDN Réaliste) : Faux amis plausibles, Données ambiguës, Examens inutiles proposés.

RÈGLES D'INTERACTION :
- Si l'utilisateur pose une question hors-sujet : "Question notée. Nous y reviendrons après la fin du DP."
- Si l'utilisateur demande "Complexifie", adapte le niveau immédiatement.

GESTION DES ERREURS (CRUCIAL) :
Si l'étudiant commet une erreur significative (mauvais diagnostic, mauvaise prise en charge, oubli grave), tu DOIS ajouter à la fin de ta réponse un bloc de code JSON caché, balisé strictement comme ceci :
[CAPTURE_ERREUR]
{
"matiere": "Nom Exact de la matière selon la liste officielle",
"question": "Le résumé de la question posée",
"erreur_commise": "Le résumé de la réponse fausse de l'étudiant",
"correction": "La réponse attendue et le point clé à retenir (court)",
"date": "TIMESTAMP_JS"
}
[/CAPTURE_ERREUR]

LISTE OFFICIELLE DES MATIÈRES (Utilise uniquement ces noms exacts pour le champ "matiere") :
Cancérologie
Cardiologie et Médecine vasculaire
Chirurgie maxillo-faciale
Dermatologie
Endocrinologie, diabète, nutrition
Gériatrie
Gynécologie et obstétrique
Hématologie
Hépato-gastro-entérologie et chirurgie digestive
Infectiologie
Médecine interne
Médecine physique et réadaptation
Néphrologie
Neurologie
Ophtalmologie
ORL
Orthopédie
Pédiatrie
Pneumologie et allergologie
Psychiatrie
Rhumatologie
Santé publique, médecine du travail, médecine légale
Urgence, anesthésie, réanimation
Urologie

FORMAT DE SORTIE : Utilise du Markdown clair (Gras pour les mots-clés importants).
`;

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

    // Synchroniser les champs du formulaire config avec les valeurs cloud
    useEffect(() => {
        if (configLoaded) {
            setLocalApiKey(apiKey);
            setLocalModelId(cloudModelId);
        }
    }, [configLoaded, apiKey, cloudModelId]);

    // Charger l'historique du chat depuis localStorage
    useEffect(() => {
        const storedHistory = localStorage.getItem('dp_chat_history');
        if (storedHistory) {
            try {
                const validated = validateChatMessages(JSON.parse(storedHistory));
                setMessages(validated.length > 0 ? validated : [{ id: 'welcome', role: 'model', text: WELCOME_MSG, timestamp: Date.now() }]);
            } catch {
                setMessages([{ id: 'welcome', role: 'model', text: WELCOME_MSG, timestamp: Date.now() }]);
            }
        } else {
            setMessages([{ id: 'welcome', role: 'model', text: WELCOME_MSG, timestamp: Date.now() }]);
        }
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        if (messages.length > 0 && messages.some(m => m.role === 'user' || m.role === 'model')) {
            localStorage.setItem('dp_chat_history', JSON.stringify(messages));
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
            localStorage.removeItem('dp_chat_history');
            setMessages([{
                id: crypto.randomUUID(), role: 'model',
                text: "Session réinitialisée. " + WELCOME_MSG,
                timestamp: Date.now()
            }]);
        }
    };

    // --- Error extraction — COPIE FIDÈLE ---
    const extractAndSaveErrors = useCallback((text: string): string => {
        const regex = /\[CAPTURE_ERREUR\]([\s\S]*?)\[\/CAPTURE_ERREUR\]/g;
        let cleanText = text;
        let match;
        let captured = false;

        while ((match = regex.exec(text)) !== null) {
            try {
                const errorData = JSON.parse(match[1]);

                // Deduplicate: check if same matiere+question already exists
                let existingErrors: ErrorEntry[] = [];
                try {
                    existingErrors = validateErrorBank(JSON.parse(localStorage.getItem('med-pilot-error-bank') || '[]'));
                } catch { /* start fresh */ }

                const isDuplicate = existingErrors.some(e =>
                    e.matiere === errorData.matiere && e.question === errorData.question
                );

                if (!isDuplicate) {
                    const newError: ErrorEntry = {
                        id: crypto.randomUUID(),
                        matiere: errorData.matiere || "Non classé",
                        question: errorData.question || "Question inconnue",
                        erreur_commise: errorData.erreur_commise || "Erreur non spécifiée",
                        correction: errorData.correction || "Voir débriefing",
                        date: Date.now(),
                        isExported: false,
                    };
                    const updated = [newError, ...existingErrors];
                    localStorage.setItem('med-pilot-error-bank', JSON.stringify(updated));
                    // Sync vers Supabase
                    const supabase = createClient();
                    supabase.auth.getUser().then(({ data: { user } }) => {
                        if (user) supabase.from('user_data').upsert(
                            { user_id: user.id, data_key: 'med-pilot-error-bank', data_value: updated },
                            { onConflict: 'user_id,data_key' }
                        );
                    });
                    captured = true;
                }
            } catch (e) {
                console.error("Failed to parse captured error JSON", e);
            }
        }

        cleanText = cleanText.replace(regex, '').trim();
        if (captured) onErrorCaptured?.();
        return cleanText;
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
        setMessages(prev => [...prev, newUserMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const effectiveModel = cloudModelId || "gemini-2.5-flash";
            const model = genAI.getGenerativeModel({
                model: effectiveModel,
                systemInstruction: DP_SYSTEM_INSTRUCTIONS,
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                ],
            });

            const rawHistory = messages.filter(m => m.role !== 'system');
            const firstUserIndex = rawHistory.findIndex(m => m.role === 'user');
            const chatHistory = firstUserIndex !== -1
                ? rawHistory.slice(firstUserIndex).map(m => ({ role: m.role, parts: [{ text: m.text }] }))
                : [];

            const chat = model.startChat({ history: chatHistory });
            const result = await chat.sendMessage(input);
            const response = await result.response;
            let rawText: string;
            try { rawText = response.text(); } catch { rawText = ''; }

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
                        <div key={msg.id} className={cn(
                            "flex gap-3 mb-5",
                            msg.role === 'user' ? "ml-auto flex-row-reverse max-w-[85%]" : "max-w-full"
                        )}>
                            <div className={cn(
                                "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                                msg.role === 'user' ? "border-[var(--color-accent-border)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]" :
                                msg.role === 'system' ? "border-amber-400/30 bg-amber-400/10 text-amber-400" :
                                "border-[var(--color-border-default)] bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]"
                            )}>
                                {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> :
                                 msg.role === 'system' ? <AlertTriangle className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                            </div>
                            <div className={cn(
                                "rounded-2xl border px-4 py-3 text-sm leading-relaxed",
                                msg.role === 'user'
                                    ? "rounded-tr-md border-[var(--color-accent-border)] bg-[var(--color-accent-soft)] text-[var(--color-text-primary)]"
                                    : msg.role === 'system'
                                    ? "border-amber-400/30 bg-amber-400/10"
                                    : "rounded-tl-md border-[var(--color-border-default)] bg-[var(--color-bg-card)] text-[var(--color-text-primary)]"
                            )}>
                                {msg.role === 'model' ? (
                                    <ReactMarkdown components={{
                                        strong: ({ ...props }) => <span className="font-semibold text-[var(--color-accent)]" {...props} />,
                                        ul: ({ ...props }) => <ul className="list-disc list-inside my-2 space-y-1" {...props} />,
                                        ol: ({ ...props }) => <ol className="list-decimal list-inside my-2 space-y-1" {...props} />,
                                        p: ({ ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                        h2: ({ ...props }) => <h2 className="text-base font-bold mt-4 mb-2 text-[var(--color-text-primary)]" {...props} />,
                                        h3: ({ ...props }) => <h3 className="text-sm font-bold mt-3 mb-1.5 text-[var(--color-text-primary)]" {...props} />,
                                    }}>
                                        {msg.text}
                                    </ReactMarkdown>
                                ) : <span className="text-[var(--color-text-primary)]">{msg.text}</span>}
                            </div>
                        </div>
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
