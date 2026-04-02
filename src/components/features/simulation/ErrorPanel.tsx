"use client";

import React, { useState } from 'react';
import { useCloudStorage } from '@/hooks/useCloudStorage';
import {
    AlertCircle, ChevronDown, ChevronRight, Trash2, Pencil, Plus, X, Check,
    Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ErrorEntry } from '@/types';
import { validateErrorBank } from '@/lib/validators';

type FilterMode = 'all' | 'new' | 'exported';

interface ErrorPanelProps {
    refreshTrigger: number;
    onRequestAnki: () => void;
}

export const ErrorPanel = ({ refreshTrigger: _refreshTrigger, onRequestAnki }: ErrorPanelProps) => {
    const { data: rawErrors, save: saveErrors } = useCloudStorage<ErrorEntry[]>('med-pilot-error-bank', []);
    const errors = validateErrorBank(rawErrors);
    const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
    const [filter, setFilter] = useState<FilterMode>('all');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ question: '', erreur_commise: '', correction: '', matiere: '' });
    const [showAddForm, setShowAddForm] = useState(false);
    const [addForm, setAddForm] = useState({ matiere: '', question: '', erreur_commise: '', correction: '' });

    const deleteError = (id: string) => {
        saveErrors(errors.filter(e => e.id !== id));
    };

    const startEdit = (error: ErrorEntry) => {
        setEditingId(error.id);
        setEditForm({
            question: error.question,
            erreur_commise: error.erreur_commise,
            correction: error.correction,
            matiere: error.matiere,
        });
    };

    const saveEdit = () => {
        if (!editingId) return;
        saveErrors(errors.map(e => e.id === editingId ? { ...e, ...editForm } : e));
        setEditingId(null);
    };

    const handleAddManual = () => {
        if (!addForm.matiere.trim() || !addForm.question.trim()) return;
        const newError: ErrorEntry = {
            id: crypto.randomUUID(),
            matiere: addForm.matiere.trim(),
            question: addForm.question.trim(),
            erreur_commise: addForm.erreur_commise.trim() || "Non précisé",
            correction: addForm.correction.trim() || "À compléter",
            date: Date.now(),
            isExported: false,
        };
        saveErrors([newError, ...errors]);
        setAddForm({ matiere: '', question: '', erreur_commise: '', correction: '' });
        setShowAddForm(false);
    };

    const clearAll = () => {
        if (confirm("Supprimer toutes les erreurs ?")) saveErrors([]);
    };

    const toggleSubject = (subject: string) => {
        setExpandedSubjects(prev => {
            const next = new Set(prev);
            if (next.has(subject)) next.delete(subject); else next.add(subject);
            return next;
        });
    };

    // Filtering
    const filtered = errors.filter(e => {
        if (filter === 'new') return !e.isExported;
        if (filter === 'exported') return !!e.isExported;
        return true;
    });

    // Group by subject
    const grouped = filtered.reduce<Record<string, ErrorEntry[]>>((acc, e) => {
        (acc[e.matiere] = acc[e.matiere] || []).push(e);
        return acc;
    }, {});

    const sortedSubjects = Object.entries(grouped).sort((a, b) =>
        Math.max(...b[1].map(e => e.date)) - Math.max(...a[1].map(e => e.date))
    );

    const newCount = errors.filter(e => !e.isExported).length;

    return (
        <div className="flex flex-col h-full overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-card)]">
            {/* Header */}
            <div className="shrink-0 border-b border-[var(--color-border-default)] px-3 py-3">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-[var(--color-accent)]" />
                        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Erreurs</h3>
                        <span className="text-[10px] font-mono text-[var(--color-text-muted)]">{errors.length}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setShowAddForm(!showAddForm)}
                            className="h-6 w-6 flex items-center justify-center rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]">
                            <Plus className="h-3 w-3" />
                        </button>
                        {errors.length > 0 && (
                            <button onClick={onRequestAnki}
                                className="h-6 w-6 flex items-center justify-center rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]"
                                title="Export Anki">
                                <Download className="h-3 w-3" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Filter pills */}
                <div className="flex gap-1">
                    {([['all', 'Tout'], ['new', `Nouveau (${newCount})`], ['exported', 'Exporté']] as [FilterMode, string][]).map(([id, label]) => (
                        <button key={id} onClick={() => setFilter(id)}
                            className={cn(
                                "text-[9px] font-medium px-2 py-0.5 rounded-md border transition-all",
                                filter === id
                                    ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                                    : "border-[var(--color-border-default)] text-[var(--color-text-hint)]"
                            )}>
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Manual add form */}
            {showAddForm && (
                <div className="shrink-0 border-b border-[var(--color-border-default)] p-3 space-y-2 bg-[var(--color-bg-tertiary)]">
                    <input value={addForm.matiere} onChange={e => setAddForm(p => ({ ...p, matiere: e.target.value }))}
                        placeholder="Matière" className="app-input w-full text-[11px]" />
                    <input value={addForm.question} onChange={e => setAddForm(p => ({ ...p, question: e.target.value }))}
                        placeholder="Question / Contexte" className="app-input w-full text-[11px]" />
                    <input value={addForm.erreur_commise} onChange={e => setAddForm(p => ({ ...p, erreur_commise: e.target.value }))}
                        placeholder="Erreur commise" className="app-input w-full text-[11px]" />
                    <input value={addForm.correction} onChange={e => setAddForm(p => ({ ...p, correction: e.target.value }))}
                        placeholder="Correction" className="app-input w-full text-[11px]" />
                    <div className="flex gap-1">
                        <button onClick={handleAddManual} className="app-btn-primary text-[10px] flex-1">Ajouter</button>
                        <button onClick={() => setShowAddForm(false)} className="app-btn-ghost text-[10px]">
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                </div>
            )}

            {/* Error list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {sortedSubjects.length === 0 ? (
                    <div className="text-center py-8">
                        <AlertCircle className="h-8 w-8 mx-auto text-[var(--color-text-hint)] mb-2" />
                        <p className="text-xs text-[var(--color-text-muted)]">
                            {errors.length === 0 ? "Aucune erreur capturée" : "Aucune erreur pour ce filtre"}
                        </p>
                    </div>
                ) : (
                    sortedSubjects.map(([subject, subErrors]) => (
                        <div key={subject}>
                            <button
                                onClick={() => toggleSubject(subject)}
                                className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors"
                            >
                                {expandedSubjects.has(subject)
                                    ? <ChevronDown className="h-3 w-3 text-[var(--color-text-hint)]" />
                                    : <ChevronRight className="h-3 w-3 text-[var(--color-text-hint)]" />}
                                <span className="text-xs font-medium text-[var(--color-text-primary)] truncate flex-1 text-left">{subject}</span>
                                <span className="text-[10px] font-mono text-[var(--color-text-muted)]">{subErrors.length}</span>
                            </button>

                            {expandedSubjects.has(subject) && (
                                <div className="ml-4 space-y-1 mb-1">
                                    {subErrors.map(err => (
                                        <div key={err.id} className="rounded-lg border border-[var(--color-border-default)] p-2 group">
                                            {editingId === err.id ? (
                                                <div className="space-y-1">
                                                    <input value={editForm.question} onChange={e => setEditForm(p => ({ ...p, question: e.target.value }))}
                                                        className="app-input w-full text-[10px]" />
                                                    <input value={editForm.erreur_commise} onChange={e => setEditForm(p => ({ ...p, erreur_commise: e.target.value }))}
                                                        className="app-input w-full text-[10px]" />
                                                    <input value={editForm.correction} onChange={e => setEditForm(p => ({ ...p, correction: e.target.value }))}
                                                        className="app-input w-full text-[10px]" />
                                                    <div className="flex gap-1">
                                                        <button onClick={saveEdit} className="text-emerald-400"><Check className="h-3 w-3" /></button>
                                                        <button onClick={() => setEditingId(null)} className="text-[var(--color-text-hint)]"><X className="h-3 w-3" /></button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <p className="text-[11px] font-medium text-[var(--color-text-primary)] leading-tight">{err.question}</p>
                                                    <p className="text-[10px] text-red-400 mt-0.5">{err.erreur_commise}</p>
                                                    <p className="text-[10px] text-emerald-400 mt-0.5">{err.correction}</p>
                                                    <div className="flex items-center justify-between mt-1">
                                                        <span className="text-[9px] text-[var(--color-text-hint)]">
                                                            {new Date(err.date).toLocaleDateString('fr-FR')}
                                                            {err.isExported && " · Exporté"}
                                                        </span>
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => startEdit(err)} className="text-[var(--color-text-hint)] hover:text-[var(--color-accent)]">
                                                                <Pencil className="h-2.5 w-2.5" />
                                                            </button>
                                                            <button onClick={() => deleteError(err.id)} className="text-[var(--color-text-hint)] hover:text-red-400">
                                                                <Trash2 className="h-2.5 w-2.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Footer */}
            {errors.length > 0 && (
                <div className="shrink-0 border-t border-[var(--color-border-default)] px-3 py-2 flex justify-between items-center">
                    <span className="text-[9px] text-[var(--color-text-hint)]">{newCount} non exportée{newCount > 1 ? 's' : ''}</span>
                    <button onClick={clearAll} className="text-[9px] text-[var(--color-text-hint)] hover:text-red-400">Tout effacer</button>
                </div>
            )}
        </div>
    );
};
