import {
    GoogleGenerativeAI,
    HarmBlockThreshold,
    HarmCategory,
} from '@google/generative-ai';
import type { ChatMessage } from './types';

export const DP_SYSTEM_INSTRUCTIONS = `
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

export type GeminiHistoryItem = {
    role: 'user' | 'model';
    parts: { text: string }[];
};

interface AskGeminiOptions {
    apiKey: string;
    modelId?: string;
    prompt: string;
    history?: GeminiHistoryItem[];
    systemInstruction?: string;
}

function isGeminiHistoryMessage(
    message: ChatMessage,
): message is ChatMessage & { role: 'user' | 'model' } {
    return message.role === 'user' || message.role === 'model';
}

export function buildGeminiHistory(messages: readonly ChatMessage[]): GeminiHistoryItem[] {
    const rawHistory = messages.filter(isGeminiHistoryMessage);
    const firstUserIndex = rawHistory.findIndex(message => message.role === 'user');

    if (firstUserIndex === -1) {
        return [];
    }

    return rawHistory.slice(firstUserIndex).map(message => ({
        role: message.role,
        parts: [{ text: message.text }],
    }));
}

export async function askGemini({
    apiKey,
    modelId,
    prompt,
    history = [],
    systemInstruction = DP_SYSTEM_INSTRUCTIONS,
}: AskGeminiOptions): Promise<string> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: modelId || 'gemini-2.0-flash',
        systemInstruction,
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
    });

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    try {
        return response.text();
    } catch {
        return '';
    }
}
