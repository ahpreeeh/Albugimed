"use client";

// ─── EventModal ──────────────────────────────────────────────────────
// Modale de création / édition d'événement ou tâche dans la grille
// hebdomadaire du planning. Extrait de PlanningView.tsx (Phase 5
// step 5.4).
//
// Pure UI : reçoit son state initial via props, appelle onSave / onClose
// / onDelete. Pas d'accès store ni cloud.

import React, { useState, useRef, useEffect } from 'react';
import { X, Clock, Calendar, Save, Trash2, CalendarDays, BookOpen } from 'lucide-react';
import type { ModalData } from '@/entities/planning/types';
import { timeToMinutes, addHourHelper } from '@/entities/planning/model';
import { cn } from '@/shared/lib/cn';

interface EventModalProps {
    data: ModalData;
    onClose: () => void;
    onSave: (data: ModalData) => void;
    onDelete?: () => void;
}

export const EventModal: React.FC<EventModalProps> = ({ data, onClose, onSave, onDelete }) => {
    const [title, setTitle] = useState(data.title);
    const [type, setType] = useState(data.type);
    const [startTime, setStartTime] = useState(data.startTime);
    const [endTime, setEndTime] = useState(data.endTime);
    const titleRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setTimeout(() => titleRef.current?.focus(), 100);
    }, []);

    const handleSave = () => {
        onSave({ ...data, title: title || 'Nouvel événement', type, startTime, endTime });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200" />
            <div
                onClick={e => e.stopPropagation()}
                className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            >
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                    <span className="app-kicker block mb-0">
                        {data.mode === 'create' ? 'Nouveau Bloc' : 'Modifier'}
                    </span>
                    <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-[10px] text-[var(--color-text-muted)] hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)] transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <input
                        ref={titleRef}
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Titre de l'événement..."
                        className="w-full bg-transparent text-[16px] font-semibold text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none border-b border-slate-200 pb-2 focus:border-[var(--color-accent)] transition-colors"
                        onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
                    />

                    <div className="flex gap-2">
                        <button
                            onClick={() => setType('event')}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-bold uppercase tracking-wider transition-all border",
                                type === 'event'
                                    ? "bg-sky-50 border-sky-200 text-sky-600 shadow-sm"
                                    : "bg-slate-50 border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-slate-300"
                            )}
                        >
                            <CalendarDays className="w-4 h-4" />
                            Événement
                        </button>
                        <button
                            onClick={() => setType('task')}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-bold uppercase tracking-wider transition-all border",
                                type === 'task'
                                    ? "bg-amber-50 border-amber-200 text-amber-600 shadow-sm"
                                    : "bg-slate-50 border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-slate-300"
                            )}
                        >
                            <BookOpen className="w-4 h-4" />
                            Tâche
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex-1">
                            <label className="app-kicker block mb-2">Début</label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                                <input
                                    type="time"
                                    value={startTime}
                                    onChange={e => {
                                        setStartTime(e.target.value);
                                        if (timeToMinutes(e.target.value) >= timeToMinutes(endTime)) {
                                            setEndTime(addHourHelper(e.target.value));
                                        }
                                    }}
                                    className="app-input w-full pl-9 font-mono"
                                />
                            </div>
                        </div>
                        <div className="text-[var(--color-text-muted)] font-mono text-lg mt-6">→</div>
                        <div className="flex-1">
                            <label className="app-kicker block mb-2">Fin</label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                                <input
                                    type="time"
                                    value={endTime}
                                    onChange={e => setEndTime(e.target.value)}
                                    className="app-input w-full pl-9 font-mono"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="text-[13px] text-[var(--color-text-secondary)] bg-[var(--color-bg-sidebar)] rounded-lg px-3 py-2 flex items-center justify-center gap-2 border border-[var(--color-border)]">
                        <Calendar className="w-4 h-4" />
                        {new Date(data.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                </div>

                <div className="flex items-center justify-between px-5 py-4 border-t border-[var(--color-border)] bg-[var(--color-bg-sidebar)]">
                    {data.mode === 'edit' && onDelete ? (
                        <button
                            onClick={onDelete}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-medium text-red-500 hover:bg-red-50 transition-all"
                        >
                            <Trash2 className="w-4 h-4" />
                            Supprimer
                        </button>
                    ) : <div />}

                    <button
                        onClick={handleSave}
                        className="app-btn app-btn-primary px-5"
                    >
                        <Save className="w-4 h-4 mr-1.5" />
                        Enregistrer
                    </button>
                </div>
            </div>
        </div>
    );
};
