"use client";

import React, { useState } from "react";
import {
    X, Plus, Trash2, Check, Pencil, Upload, CalendarClock,
} from "lucide-react";
import {
    Subject, useSubjects, getIconComponent,
} from "@/context/SubjectContext";
import { cn } from "@/shared/lib/cn";

interface Props {
    subject: Subject;
    onClose: () => void;
}

export const SubjectDetailModal = ({ subject, onClose }: Props) => {
    const {
        updateSubject, deleteSubject,
        addChapter, addChaptersBulk, editChapterTitle, deleteChapter, toggleChapterStatus,
    } = useSubjects();

    const [newChapter, setNewChapter] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");
    const [showBulk, setShowBulk] = useState(false);
    const [bulkText, setBulkText] = useState("");
    const [examDate, setExamDate] = useState(subject.examDate ?? "");
    const [year, setYear] = useState(subject.year ?? "");
    const [semester, setSemester] = useState(subject.semester ?? "");
    const [confirmDelete, setConfirmDelete] = useState(false);

    const Icon = getIconComponent(subject.iconName);

    const stats = {
        total: subject.chapters.length,
        t1: subject.chapters.filter(c => c.status.t1).length,
        annales: subject.chapters.filter(c => c.status.annales).length,
        t2: subject.chapters.filter(c => c.status.t2).length,
    };

    const handleAddChapter = () => {
        if (!newChapter.trim()) return;
        addChapter(subject.id, newChapter.trim());
        setNewChapter("");
    };

    const handleBulkAdd = () => {
        const lines = bulkText.split("\n").filter(l => l.trim());
        if (lines.length === 0) return;
        addChaptersBulk(subject.id, lines);
        setBulkText("");
        setShowBulk(false);
    };

    const handleExamDateChange = (val: string) => {
        setExamDate(val);
        updateSubject(subject.id, { examDate: val || undefined });
    };

    const startEdit = (chapterId: string, currentTitle: string) => {
        setEditingId(chapterId);
        setEditValue(currentTitle);
    };

    const saveEdit = (chapterId: string) => {
        if (editValue.trim()) {
            editChapterTitle(subject.id, chapterId, editValue.trim());
        }
        setEditingId(null);
    };

    const handleDelete = () => {
        if (!confirmDelete) { setConfirmDelete(true); return; }
        deleteSubject(subject.id);
        onClose();
    };

    const flagLabel = (type: 't1' | 'annales' | 't2') => {
        switch (type) {
            case 't1': return 'Cours';
            case 'annales': return 'Ann.';
            case 't2': return 'Rév.';
        }
    };

    const flagStyles = (type: 't1' | 'annales' | 't2', active: boolean) => {
        if (!active) {
            return "border-[var(--color-border-default)] text-[var(--color-text-muted)] bg-[var(--color-bg-primary)] hover:border-[var(--color-text-hint)]";
        }
        switch (type) {
            case 't1': return "border-blue-400 bg-blue-400/15 text-blue-500 font-semibold";
            case 'annales': return "border-violet-400 bg-violet-400/15 text-violet-500 font-semibold";
            case 't2': return "border-emerald-400 bg-emerald-400/15 text-emerald-500 font-semibold";
        }
    };

    return (
        <div className="app-modal-backdrop" onClick={onClose}>
            <div
                className="app-modal w-full max-w-2xl max-h-[85vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-5 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)] border border-[var(--color-accent-border)]">
                            <Icon className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">{subject.title}</h2>
                            <div className="flex items-center gap-3 mt-0.5">
                                <span className="text-[11px] text-[var(--color-text-secondary)]">{stats.total} chapitres</span>
                                <span className="text-[10px] font-mono text-blue-500">Cours {stats.t1}/{stats.total}</span>
                                <span className="text-[10px] font-mono text-violet-500">Ann. {stats.annales}/{stats.total}</span>
                                <span className="text-[10px] font-mono text-emerald-500">Rév. {stats.t2}/{stats.total}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-all">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Year / Semester / Exam date */}
                <div className="flex items-center gap-3 mb-4 shrink-0 flex-wrap">
                    <div className="flex items-center gap-1.5">
                        <label className="text-[11px] text-[var(--color-text-muted)]">Année :</label>
                        <select
                            value={year}
                            onChange={e => { setYear(e.target.value); updateSubject(subject.id, { year: e.target.value || undefined }); }}
                            className="app-input text-xs py-1 px-2"
                        >
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
                    <div className="flex items-center gap-1.5">
                        <label className="text-[11px] text-[var(--color-text-muted)]">Semestre :</label>
                        <select
                            value={semester}
                            onChange={e => { setSemester(e.target.value); updateSubject(subject.id, { semester: e.target.value || undefined }); }}
                            className="app-input text-xs py-1 px-2"
                        >
                            <option value="">—</option>
                            <option value="S1">S1</option>
                            <option value="S2">S2</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <CalendarClock className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                        <label className="text-[11px] text-[var(--color-text-muted)]">Examen :</label>
                        <input
                            type="date"
                            value={examDate}
                            onChange={e => handleExamDateChange(e.target.value)}
                            className="app-input text-xs py-1 px-2"
                        />
                    </div>
                </div>

                {/* Chapters list */}
                <div className="flex-1 overflow-y-auto min-h-0 mb-4 -mx-1">
                    {subject.chapters.length === 0 ? (
                        <p className="text-center text-sm text-[var(--color-text-muted)] py-8">
                            Aucun chapitre. Ajoutez-en ci-dessous.
                        </p>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="text-[10px] uppercase tracking-wider text-[var(--color-text-hint)]">
                                    <th className="text-left font-medium pb-2 pl-2">Chapitre</th>
                                    <th className="font-medium pb-2 w-16 text-center">Cours</th>
                                    <th className="font-medium pb-2 w-16 text-center">Ann.</th>
                                    <th className="font-medium pb-2 w-16 text-center">Rév.</th>
                                    <th className="w-16 pb-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {subject.chapters.map((ch, idx) => (
                                    <tr
                                        key={ch.id}
                                        className={cn(
                                            "group transition-colors",
                                            idx % 2 === 0
                                                ? "bg-transparent"
                                                : "bg-[var(--color-bg-tertiary)]/50"
                                        )}
                                    >
                                        {/* Title */}
                                        <td className="py-2 pl-2 pr-2">
                                            {editingId === ch.id ? (
                                                <input
                                                    value={editValue}
                                                    onChange={e => setEditValue(e.target.value)}
                                                    onBlur={() => saveEdit(ch.id)}
                                                    onKeyDown={e => e.key === 'Enter' && saveEdit(ch.id)}
                                                    className="app-input text-xs w-full py-1"
                                                    autoFocus
                                                />
                                            ) : (
                                                <span
                                                    className="text-[13px] text-[var(--color-text-primary)] cursor-pointer hover:text-[var(--color-accent)] transition-colors"
                                                    onDoubleClick={() => startEdit(ch.id, ch.title)}
                                                >
                                                    {ch.title}
                                                </span>
                                            )}
                                        </td>

                                        {/* Status flags */}
                                        {(['t1', 'annales', 't2'] as const).map(type => (
                                            <td key={type} className="py-2 text-center">
                                                <button
                                                    onClick={() => toggleChapterStatus(subject.id, ch.id, type)}
                                                    className={cn(
                                                        "inline-flex h-7 w-14 items-center justify-center gap-1 rounded-md border text-[10px] transition-all",
                                                        flagStyles(type, ch.status[type])
                                                    )}
                                                >
                                                    {ch.status[type] && <Check className="h-3 w-3" />}
                                                    {flagLabel(type)}
                                                </button>
                                            </td>
                                        ))}

                                        {/* Actions */}
                                        <td className="py-2 pr-2">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                <button
                                                    onClick={() => startEdit(ch.id, ch.title)}
                                                    className="h-6 w-6 flex items-center justify-center rounded-md text-[var(--color-text-hint)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] transition-all"
                                                >
                                                    <Pencil className="h-3 w-3" />
                                                </button>
                                                <button
                                                    onClick={() => deleteChapter(subject.id, ch.id)}
                                                    className="h-6 w-6 flex items-center justify-center rounded-md text-[var(--color-text-hint)] hover:text-red-400 hover:bg-red-400/10 transition-all"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Add chapter */}
                <div className="shrink-0 space-y-2 border-t border-[var(--color-border-default)] pt-3">
                    {showBulk ? (
                        <div className="space-y-2">
                            <textarea
                                value={bulkText}
                                onChange={e => setBulkText(e.target.value)}
                                rows={4}
                                placeholder="Collez ici — un chapitre par ligne"
                                className="app-input w-full resize-none font-mono text-xs"
                            />
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-[var(--color-text-muted)]">
                                    {bulkText.split("\n").filter(l => l.trim()).length} lignes
                                </span>
                                <div className="flex gap-2">
                                    <button onClick={() => setShowBulk(false)}
                                        className="text-xs font-medium px-3 py-1.5 rounded-lg border border-[var(--color-border-default)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-all">
                                        Annuler
                                    </button>
                                    <button onClick={handleBulkAdd}
                                        className="text-xs font-medium px-3 py-1.5 rounded-lg border border-[var(--color-accent)]/40 bg-[var(--color-accent-soft)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white transition-all">
                                        Ajouter tout
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <input
                                value={newChapter}
                                onChange={e => setNewChapter(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddChapter()}
                                placeholder="Nouveau chapitre..."
                                className="app-input flex-1 text-xs"
                            />
                            <button onClick={handleAddChapter}
                                className="flex items-center justify-center h-9 w-9 rounded-lg border border-dashed border-[var(--color-border-default)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-all">
                                <Plus className="h-3.5 w-3.5" />
                            </button>
                            <button
                                onClick={() => setShowBulk(true)}
                                className="flex items-center gap-1.5 text-xs font-medium px-3 rounded-lg border border-dashed border-[var(--color-border-default)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-all"
                                title="Import en masse"
                            >
                                <Upload className="h-3.5 w-3.5" /> Coller
                            </button>
                        </div>
                    )}

                    {/* Delete subject */}
                    <div className="flex justify-end pt-2">
                        <button
                            onClick={handleDelete}
                            className={cn(
                                "text-xs px-3 py-1.5 rounded-lg border transition-all",
                                confirmDelete
                                    ? "border-red-400 bg-red-400/10 text-red-400"
                                    : "border-[var(--color-border-default)] text-[var(--color-text-muted)] hover:text-red-400 hover:border-red-400/40"
                            )}
                        >
                            {confirmDelete ? "Confirmer la suppression" : "Supprimer la matière"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
