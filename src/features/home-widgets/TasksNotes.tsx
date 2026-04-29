"use client";

import { useEffect, useState } from "react";
import {
    Plus, CheckSquare, FileText, Trash2, X,
    Save, ChevronDown, ChevronUp,
} from "lucide-react";
import { useCloudValue } from "@/shared/hooks/useCloudValue";
import { cn } from "@/shared/lib/cn";
// ——— Tasks & Notes ———
const TASKS_KEY = 'med-pilot-quick-tasks';
const NOTES_KEY = 'med-pilot-quick-notes';
const NOTES_V2_KEY = 'med-pilot-quick-notes-v2';

interface QuickTask { id: string; text: string; done: boolean; }
export interface QuickNote { id: string; title: string; content: string; updatedAt: number; }

export function deriveTitle(content: string): string {
    const firstLine = content.split('\n').find(l => l.trim()) || '';
    const trimmed = firstLine.trim();
    return trimmed.length > 40 ? trimmed.slice(0, 40) + '…' : trimmed;
}

export function formatNoteDate(ts: number): string {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "À l'instant";
    if (diffMin < 60) return `Il y a ${diffMin}min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `Il y a ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `Il y a ${diffD}j`;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export const TasksNotes = () => {
    const [tab, setTab] = useState<'tasks' | 'notes'>('tasks');
    const { data: tasks, save: saveTasks } = useCloudValue<QuickTask[]>(TASKS_KEY, []);
    const { data: savedNotes, save: saveNotesV2, isReady: notesReady } = useCloudValue<QuickNote[]>(NOTES_V2_KEY, []);
    const { data: oldNotes } = useCloudValue<string>(NOTES_KEY, '');
    const [input, setInput] = useState('');

    // Notes state
    const [draft, setDraft] = useState('');
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [migrated, setMigrated] = useState(false);

    // Migration: old single-note string → first QuickNote
    useEffect(() => {
        if (!notesReady || migrated) return;
        if (savedNotes.length === 0 && oldNotes && oldNotes.trim()) {
            const migrationNote: QuickNote = {
                id: 'migrated-' + Date.now(),
                title: deriveTitle(oldNotes),
                content: oldNotes,
                updatedAt: Date.now(),
            };
            saveNotesV2([migrationNote]);
        }
        setMigrated(true);
    }, [notesReady, savedNotes, oldNotes, migrated, saveNotesV2]);

    // Tasks
    const addTask = () => {
        if (!input.trim()) return;
        saveTasks([...tasks, { id: Date.now().toString(), text: input.trim(), done: false }]);
        setInput('');
    };

    const toggleTask = (id: string) => saveTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
    const deleteTask = (id: string) => saveTasks(tasks.filter(t => t.id !== id));

    // Notes actions
    const handleSaveNote = () => {
        if (!draft.trim()) return;
        const now = Date.now();
        if (editingNoteId) {
            // Update existing
            saveNotesV2(savedNotes.map(n =>
                n.id === editingNoteId
                    ? { ...n, title: deriveTitle(draft), content: draft, updatedAt: now }
                    : n
            ));
        } else {
            // Create new
            const newNote: QuickNote = {
                id: now.toString(),
                title: deriveTitle(draft),
                content: draft,
                updatedAt: now,
            };
            saveNotesV2([newNote, ...savedNotes]);
        }
        setDraft('');
        setEditingNoteId(null);
    };

    const handleEditNote = (note: QuickNote) => {
        setDraft(note.content);
        setEditingNoteId(note.id);
    };

    const handleCancelEdit = () => {
        setDraft('');
        setEditingNoteId(null);
    };

    const handleDeleteNote = (id: string) => {
        saveNotesV2(savedNotes.filter(n => n.id !== id));
        if (editingNoteId === id) {
            setDraft('');
            setEditingNoteId(null);
        }
    };

    const pendingCount = tasks.filter(t => !t.done).length;
    const sortedNotes = [...savedNotes].sort((a, b) => b.updatedAt - a.updatedAt);

    return (
        <div className="app-card p-3">
            {/* Tabs */}
            <div className="flex items-center gap-1 mb-3">
                <button onClick={() => setTab('tasks')}
                    className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all",
                        tab === 'tasks'
                            ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                            : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                    )}>
                    <CheckSquare className="h-3 w-3" />
                    Tâches{pendingCount > 0 && <span className="text-[9px] opacity-70">({pendingCount})</span>}
                </button>
                <button onClick={() => setTab('notes')}
                    className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all",
                        tab === 'notes'
                            ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                            : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                    )}>
                    <FileText className="h-3 w-3" />
                    Notes{savedNotes.length > 0 && <span className="text-[9px] opacity-70">({savedNotes.length})</span>}
                </button>
            </div>

            {tab === 'tasks' ? (
                <div>
                    {/* Input */}
                    <div className="flex gap-1.5 mb-2">
                        <input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addTask()}
                            placeholder="Ajouter une tâche..."
                            className="app-input flex-1 text-[11px] py-1 px-2"
                        />
                        <button onClick={addTask}
                            className="h-7 w-7 flex items-center justify-center rounded-lg border border-dashed border-[var(--color-border-default)] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-all">
                            <Plus className="h-3 w-3" />
                        </button>
                    </div>
                    {/* List */}
                    <div className="space-y-1 max-h-[180px] overflow-y-auto">
                        {tasks.length === 0 && (
                            <p className="text-[10px] text-[var(--color-text-hint)] text-center py-2">Aucune tâche</p>
                        )}
                        {tasks.map(t => (
                            <div key={t.id} className="flex items-center gap-2 group">
                                <button onClick={() => toggleTask(t.id)}
                                    className={cn(
                                        "h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 transition-all",
                                        t.done
                                            ? "bg-[var(--color-accent)] border-[var(--color-accent)]"
                                            : "border-[var(--color-border-default)] hover:border-[var(--color-accent)]"
                                    )}>
                                    {t.done && <svg viewBox="0 0 12 12" className="h-2 w-2 text-white"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" fill="none" /></svg>}
                                </button>
                                <span className={cn(
                                    "text-[11px] flex-1 min-w-0 truncate",
                                    t.done ? "line-through text-[var(--color-text-hint)]" : "text-[var(--color-text-primary)]"
                                )}>{t.text}</span>
                                <button onClick={() => deleteTask(t.id)}
                                    className="opacity-0 group-hover:opacity-100 text-[var(--color-text-hint)] hover:text-red-400 transition-all">
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div>
                    {/* Draft textarea */}
                    <textarea
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        placeholder={editingNoteId ? "Modifier la note..." : "Écrire une note..."}
                        className={cn(
                            "app-input w-full text-[11px] resize-none p-2 font-mono",
                            drawerOpen ? "h-[90px]" : "h-[140px]"
                        )}
                    />

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 mt-2">
                        <button
                            onClick={handleSaveNote}
                            disabled={!draft.trim()}
                            className={cn(
                                "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all",
                                draft.trim()
                                    ? "bg-[var(--color-accent)] text-white hover:opacity-90"
                                    : "bg-[var(--color-bg-tertiary)] text-[var(--color-text-hint)] cursor-not-allowed"
                            )}
                        >
                            <Save className="h-3 w-3" />
                            {editingNoteId ? 'Mettre à jour' : 'Enregistrer'}
                        </button>
                        {editingNoteId && (
                            <button
                                onClick={handleCancelEdit}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-all"
                            >
                                <X className="h-3 w-3" />
                                Annuler
                            </button>
                        )}
                    </div>

                    {/* Drawer toggle */}
                    <button
                        onClick={() => setDrawerOpen(!drawerOpen)}
                        className="w-full flex items-center justify-center gap-1.5 mt-2 py-1 group cursor-pointer"
                        aria-label={drawerOpen ? "Masquer les notes" : "Voir les notes sauvegardées"}
                    >
                        <div className="flex-1 h-px bg-[var(--color-border-default)] group-hover:bg-[var(--color-accent)] transition-colors" />
                        <span className="text-[9px] text-[var(--color-text-hint)] group-hover:text-[var(--color-accent)] transition-colors flex items-center gap-0.5">
                            {savedNotes.length > 0 && `${savedNotes.length} note${savedNotes.length > 1 ? 's' : ''}`}
                            {drawerOpen ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
                        </span>
                        <div className="flex-1 h-px bg-[var(--color-border-default)] group-hover:bg-[var(--color-accent)] transition-colors" />
                    </button>

                    {/* Saved notes drawer */}
                    <div
                        className={cn(
                            "overflow-hidden transition-all duration-200 ease-in-out",
                            drawerOpen ? "max-h-[120px] opacity-100" : "max-h-0 opacity-0"
                        )}
                    >
                        <div className="space-y-1 overflow-y-auto max-h-[120px] pt-1">
                            {sortedNotes.length === 0 && (
                                <p className="text-[10px] text-[var(--color-text-hint)] text-center py-2">Aucune note sauvegardée</p>
                            )}
                            {sortedNotes.map(note => (
                                <div
                                    key={note.id}
                                    className={cn(
                                        "flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer group transition-all",
                                        editingNoteId === note.id
                                            ? "bg-[var(--color-accent-soft)] border border-[var(--color-accent)]"
                                            : "hover:bg-[var(--color-bg-tertiary)]"
                                    )}
                                    onClick={() => handleEditNote(note)}
                                >
                                    <FileText className="h-3 w-3 shrink-0 text-[var(--color-text-muted)]" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-medium text-[var(--color-text-primary)] truncate">
                                            {note.title || 'Sans titre'}
                                        </p>
                                        <p className="text-[9px] text-[var(--color-text-hint)]">
                                            {formatNoteDate(note.updatedAt)}
                                        </p>
                                    </div>
                                    <button
                                        onClick={e => { e.stopPropagation(); handleDeleteNote(note.id); }}
                                        className="opacity-0 group-hover:opacity-100 text-[var(--color-text-hint)] hover:text-red-400 transition-all shrink-0"
                                        aria-label="Supprimer la note"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
