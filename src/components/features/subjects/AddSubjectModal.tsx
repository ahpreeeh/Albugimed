"use client";

import React, { useState } from "react";
import { X, Upload } from "lucide-react";
import { useSubjects, AVAILABLE_ICONS, ICON_MAP } from "@/context/SubjectContext";
import { MEDICAL_ICON_LABELS } from "@/components/icons/MedicalIcons";

interface AddSubjectModalProps {
    onClose: () => void;
}

export const AddSubjectModal = ({ onClose }: AddSubjectModalProps) => {
    const { addSubject } = useSubjects();
    const [title, setTitle] = useState("");
    const [iconName, setIconName] = useState("BookOpen");
    const [chaptersText, setChaptersText] = useState("");
    const [examDate, setExamDate] = useState("");
    const [year, setYear] = useState("");
    const [semester, setSemester] = useState("");
    const [mode, setMode] = useState<"manual" | "bulk">("manual");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        const chapters = chaptersText.split("\n").map(l => l.trim()).filter(Boolean);
        addSubject(title.trim(), iconName, chapters, {
            examDate: examDate || undefined,
            year: year || undefined,
            semester: semester || undefined,
        });
        onClose();
    };

    return (
        <div className="app-modal-backdrop" onClick={onClose}>
            <div className="app-modal w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                        Nouvelle matière
                    </h2>
                    <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Title */}
                    <div>
                        <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 block">Nom de la matière</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="ex: Cardiologie"
                            className="app-input w-full"
                            autoFocus
                        />
                    </div>

                    {/* Icon picker */}
                    <div>
                        <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 block">Icône</label>
                        <div className="flex flex-wrap gap-1.5">
                            {AVAILABLE_ICONS.map(name => {
                                const Icon = ICON_MAP[name];
                                if (!Icon) return null;
                                const label = MEDICAL_ICON_LABELS[name] || name;
                                return (
                                    <button
                                        key={name}
                                        type="button"
                                        title={label}
                                        onClick={() => setIconName(name)}
                                        className={`h-8 w-8 flex items-center justify-center rounded-lg border transition-all ${
                                            iconName === name
                                                ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                                                : "border-[var(--color-border-default)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                                        }`}
                                    >
                                        <Icon className="h-4 w-4" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Year & Semester */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 block">
                                Année <span className="text-[var(--color-text-hint)]">(optionnel)</span>
                            </label>
                            <select value={year} onChange={e => setYear(e.target.value)} className="app-input w-full">
                                <option value="">—</option>
                                <option value="PASS">PASS</option>
                                <option value="LAS">LAS</option>
                                <option value="Med2">Med2</option>
                                <option value="Med3">Med3</option>
                                <option value="Med4">Med4</option>
                                <option value="Med5">Med5</option>
                                <option value="Med6">Med6</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 block">
                                Semestre <span className="text-[var(--color-text-hint)]">(optionnel)</span>
                            </label>
                            <select value={semester} onChange={e => setSemester(e.target.value)} className="app-input w-full">
                                <option value="">—</option>
                                <option value="S1">S1</option>
                                <option value="S2">S2</option>
                            </select>
                        </div>
                    </div>

                    {/* Exam date */}
                    <div>
                        <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 block">
                            Date d&apos;examen <span className="text-[var(--color-text-hint)]">(optionnel)</span>
                        </label>
                        <input
                            type="date"
                            value={examDate}
                            onChange={e => setExamDate(e.target.value)}
                            className="app-input w-full"
                        />
                    </div>

                    {/* Chapters */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-medium text-[var(--color-text-secondary)]">Chapitres</label>
                            <button
                                type="button"
                                onClick={() => setMode(mode === "manual" ? "bulk" : "manual")}
                                className="flex items-center gap-1 text-[10px] font-medium text-[var(--color-accent)] hover:underline"
                            >
                                <Upload className="h-3 w-3" />
                                {mode === "manual" ? "Coller un programme" : "Saisie manuelle"}
                            </button>
                        </div>
                        {mode === "bulk" && (
                            <p className="text-[10px] text-[var(--color-text-hint)] mb-1.5">
                                Collez la liste du programme officiel. Un chapitre par ligne.
                            </p>
                        )}
                        <textarea
                            value={chaptersText}
                            onChange={e => setChaptersText(e.target.value)}
                            rows={6}
                            placeholder={mode === "manual"
                                ? "Un chapitre par ligne\nex:\nInsuffisance cardiaque\nTroubles du rythme\nHTA"
                                : "Collez ici toute la liste...\nChaque ligne = un chapitre"}
                            className="app-input w-full resize-none font-mono text-xs"
                        />
                        {chaptersText.trim() && (
                            <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
                                {chaptersText.split("\n").filter(l => l.trim()).length} chapitres détectés
                            </p>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="app-btn-ghost">Annuler</button>
                        <button type="submit" disabled={!title.trim()} className="app-btn-primary">
                            Créer la matière
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
