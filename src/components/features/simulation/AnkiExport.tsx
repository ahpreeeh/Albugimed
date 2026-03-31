"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, Download, Sparkles, ArrowLeft } from "lucide-react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { cn } from "@/lib/utils";
import type { ErrorEntry, Flashcard } from "@/types";

// --- COPIE FIDÈLE ---
const ANKI_SYSTEM_PROMPT = `
TÂCHE : Transforme cette liste d'erreurs médicales en Flashcards Anki.
FORMAT SORTIE ATTENDU : Une liste JSON strictement valide d'objets : [{ "question": "...", "reponse": "..." }]
CONSIGNES DE RÉDACTION :
- La question ne doit pas donner la réponse et ne doit pas être trop longue.
- La réponse doit être synthétique et factuelle (médecine ECN/EDN).
- Évite les caractères ";" dans le texte (car utilisé comme séparateur CSV).
- Si plusieurs erreurs concernent le même sujet, tu peux les regrouper ou faire plusieurs cartes.
`;

interface AnkiExportProps {
    onBack: () => void;
}

export const AnkiExport = ({ onBack }: AnkiExportProps) => {
    const [errors, setErrors] = useState<ErrorEntry[]>([]);
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [apiKey, setApiKey] = useState("");
    const [customModelId, setCustomModelId] = useState("");
    const [selectedErrorIds, setSelectedErrorIds] = useState<Set<string>>(new Set());
    const [currentBatchIds, setCurrentBatchIds] = useState<string[]>([]);

    const newErrors = errors.filter(e => !e.isExported);
    const sortedErrors = [...errors].sort((a, b) => b.date - a.date);

    useEffect(() => {
        const stored = localStorage.getItem("med-pilot-error-bank");
        if (stored) setErrors(JSON.parse(stored));
        const key = localStorage.getItem("med-pilot-gemini-key");
        if (key) setApiKey(key);
        const model = localStorage.getItem("med-pilot-gemini-model");
        if (model) setCustomModelId(model);
    }, []);

    const toggleSelection = (id: string) => {
        const next = new Set(selectedErrorIds);
        if (next.has(id)) next.delete(id); else next.add(id);
        setSelectedErrorIds(next);
    };

    const toggleSelectAll = () => {
        if (selectedErrorIds.size === errors.length) setSelectedErrorIds(new Set());
        else setSelectedErrorIds(new Set(errors.map(e => e.id)));
    };

    // --- COPIE FIDÈLE de la logique Gemini ---
    const handleGenerate = async (targetIds: string[]) => {
        if (targetIds.length === 0) return;
        if (!apiKey) { alert("Configurez votre clé API dans le Simulateur."); return; }

        setIsGenerating(true);
        setCurrentBatchIds(targetIds);

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({
                model: customModelId || "gemini-2.5-flash",
                systemInstruction: ANKI_SYSTEM_PROMPT,
            });

            const targetErrors = errors.filter(e => targetIds.includes(e.id));
            const errorsText = targetErrors
                .map(e => `- Matière: ${e.matiere}\n- Contexte: ${e.question}\n- Erreur: ${e.erreur_commise}\n- Correction: ${e.correction}`)
                .join("\n\n");

            const result = await model.generateContent(`Voici les erreurs à convertir :\n\n${errorsText}`);
            const text = (await result.response).text();

            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                setFlashcards(JSON.parse(jsonMatch[0]));
            } else {
                alert("Erreur: l'IA n'a pas renvoyé de JSON valide.");
            }
        } catch (error) {
            console.error(error);
            alert("Erreur de connexion à Gemini.");
        } finally {
            setIsGenerating(false);
        }
    };

    const downloadCSV = () => {
        if (flashcards.length === 0) return;
        let csvContent = "data:text/csv;charset=utf-8,";
        flashcards.forEach(card => {
            const q = card.question.replace(/;/g, ",").replace(/\n/g, " ");
            const a = card.reponse.replace(/;/g, ",").replace(/\n/g, " ");
            csvContent += `${q};${a}\r\n`;
        });

        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `anki_med_pilot_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        const updated = errors.map(e => currentBatchIds.includes(e.id) ? { ...e, isExported: true } : e);
        setErrors(updated);
        localStorage.setItem("med-pilot-error-bank", JSON.stringify(updated));
        setFlashcards([]);
        setCurrentBatchIds([]);
        setSelectedErrorIds(new Set());
    };

    // --- Flashcard preview state ---
    if (flashcards.length > 0) {
        return (
            <div className="flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between border-b border-[var(--color-border-default)] px-5 py-4">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-[var(--color-accent)]" />
                        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
                            Aperçu — {flashcards.length} carte{flashcards.length > 1 ? "s" : ""}
                        </h2>
                    </div>
                    <button onClick={() => setFlashcards([])} className="app-btn-ghost text-xs">Annuler</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-2">
                        {flashcards.map((card, i) => (
                            <div key={i} className="app-card p-3">
                                <p className="text-xs font-medium text-[var(--color-text-primary)]">{card.question}</p>
                                <p className="text-[11px] text-[var(--color-text-secondary)] mt-1">{card.reponse}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="border-t border-[var(--color-border-default)] px-5 py-3">
                    <button onClick={downloadCSV} className="app-btn-primary w-full flex items-center justify-center gap-2 text-sm">
                        <Download className="h-4 w-4" /> Télécharger CSV & marquer exporté
                    </button>
                </div>
            </div>
        );
    }

    // --- Main list ---
    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--color-border-default)] px-5 py-4">
                <div className="flex items-center gap-2">
                    <button onClick={onBack} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Export Anki</h2>
                </div>
                {selectedErrorIds.size > 0 && (
                    <button onClick={() => handleGenerate(Array.from(selectedErrorIds))}
                        disabled={isGenerating}
                        className="app-btn-primary text-xs">
                        {isGenerating ? "..." : `Générer (${selectedErrorIds.size})`}
                    </button>
                )}
            </div>

            {/* Quick action for new errors */}
            {newErrors.length > 0 && (
                <div className="border-b border-[var(--color-border-default)] bg-[var(--color-accent-soft)] px-5 py-4 text-center">
                    <p className="text-xs font-medium text-[var(--color-text-primary)]">{newErrors.length} erreur{newErrors.length > 1 ? 's' : ''} non exportée{newErrors.length > 1 ? 's' : ''}</p>
                    <button
                        onClick={() => handleGenerate(newErrors.map(e => e.id))}
                        disabled={isGenerating}
                        className={cn("app-btn-primary mt-2 text-xs", isGenerating && "opacity-60")}>
                        {isGenerating ? "Génération..." : `Générer ${newErrors.length} flashcard${newErrors.length > 1 ? 's' : ''}`}
                    </button>
                </div>
            )}

            {errors.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <CheckCircle2 className="h-10 w-10 mx-auto text-[var(--color-text-hint)] mb-2" />
                        <p className="text-sm text-[var(--color-text-muted)]">Aucune erreur à exporter</p>
                    </div>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-left">
                        <thead className="sticky top-0 bg-[var(--color-bg-card)] border-b border-[var(--color-border-default)]">
                            <tr className="text-[10px] uppercase tracking-wide text-[var(--color-text-hint)]">
                                <th className="w-8 px-3 py-2">
                                    <input type="checkbox" checked={selectedErrorIds.size === errors.length && errors.length > 0}
                                        onChange={toggleSelectAll} className="h-3 w-3" />
                                </th>
                                <th className="px-3 py-2">Matière</th>
                                <th className="px-3 py-2">Erreur</th>
                                <th className="px-3 py-2 text-right">Statut</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border-default)]">
                            {sortedErrors.map(err => (
                                <tr key={err.id} className={cn("hover:bg-[var(--color-bg-tertiary)]", selectedErrorIds.has(err.id) && "bg-[var(--color-accent-soft)]")}>
                                    <td className="px-3 py-2">
                                        <input type="checkbox" checked={selectedErrorIds.has(err.id)} onChange={() => toggleSelection(err.id)} className="h-3 w-3" />
                                    </td>
                                    <td className="px-3 py-2">
                                        <span className="text-[10px] font-medium text-[var(--color-text-secondary)]">{err.matiere}</span>
                                    </td>
                                    <td className="px-3 py-2 max-w-xs">
                                        <p className="text-[11px] text-[var(--color-text-primary)] line-clamp-1">{err.erreur_commise}</p>
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        {err.isExported ? (
                                            <span className="inline-flex items-center gap-1 text-[9px] text-emerald-400">
                                                <CheckCircle2 className="h-2.5 w-2.5" /> Exporté
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-[9px] text-[var(--color-accent)]">
                                                <Sparkles className="h-2.5 w-2.5" /> Nouveau
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
