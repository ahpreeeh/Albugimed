"use client";

// ─── RecurrentSlotsList ──────────────────────────────────────────────
// Vue "Récurrents" du planning : liste des créneaux qui se répètent
// chaque semaine, avec création/édition/suppression/toggle actif.
// Extrait de PlanningView.tsx (Phase 5 step 5.5).
//
// Self-contained : utilise usePlanning() pour l'état, gère son propre
// state (dialog open, editing slot, delete confirm).

import React, { useState } from 'react';
import { Plus, Repeat, Clock, Edit2, Trash2 } from 'lucide-react';
import { usePlanning } from '@/entities/planning/hooks';
import type { RecurrentSlot } from '@/entities/planning/types';
import { RecurrentSlotUtils } from '@/entities/planning/types';
import { RecurrentSlotDialog } from '@/features/planning-recurrent/RecurrentSlotDialog';
import { TYPE_COLORS, ACTIVE_BAR_COLORS } from '@/features/planning-grid/styles';

export const RecurrentSlotsList: React.FC = () => {
    const {
        recurrentSlots,
        addRecurrentSlot,
        updateRecurrentSlot,
        deleteRecurrentSlot,
        toggleRecurrentSlot,
    } = usePlanning();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingSlot, setEditingSlot] = useState<RecurrentSlot | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const handleSaveSlot = (slotData: Omit<RecurrentSlot, 'id' | 'createdAt'> | RecurrentSlot) => {
        if ('id' in slotData) {
            updateRecurrentSlot(slotData);
        } else {
            addRecurrentSlot(slotData);
        }
    };

    const handleConfirmDelete = () => {
        if (deleteConfirmId) {
            deleteRecurrentSlot(deleteConfirmId);
            setDeleteConfirmId(null);
        }
    };

    return (
        <>
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="app-section-title">
                            Gérer les créneaux récurrents
                        </h3>
                        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                            Créez des événements qui se répètent automatiquement chaque semaine
                        </p>
                    </div>
                </div>

                {recurrentSlots.length === 0 ? (
                    <div className="app-card flex flex-col items-center justify-center p-14 text-center">
                        <div className="app-icon-box mb-4 h-12 w-12 rounded-2xl">
                            <Repeat className="h-5 w-5" />
                        </div>
                        <p className="font-medium text-[var(--color-text-primary)]">
                            Aucun créneau récurrent
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                            Créez votre premier créneau pour organiser votre semaine
                        </p>
                        <button
                            className="app-btn app-btn-primary mt-5"
                            onClick={() => {
                                setEditingSlot(null);
                                setDialogOpen(true);
                            }}
                        >
                            <Plus className="h-4 w-4" />
                            Créer un créneau
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {recurrentSlots.map(slot => (
                            <div
                                key={slot.id}
                                className={`app-card flex items-start gap-4 p-4 transition-opacity ${
                                    slot.isActive ? 'opacity-100' : 'opacity-50'
                                }`}
                            >
                                {/* Color bar */}
                                <div
                                    className={`mt-1 h-14 w-1 shrink-0 rounded-full ${
                                        slot.isActive
                                            ? ACTIVE_BAR_COLORS[slot.type]
                                            : 'bg-[var(--color-bar-track)]'
                                    }`}
                                />

                                {/* Info */}
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="app-title">{slot.title}</h4>
                                        <span
                                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                                                TYPE_COLORS[slot.type].badge
                                            }`}
                                        >
                                            {RecurrentSlotUtils.typeLabels[slot.type]}
                                        </span>
                                        {!slot.isActive && (
                                            <span className="app-pill text-[10px]">
                                                Désactivé
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
                                        <span className="flex items-center gap-1">
                                            <Repeat className="h-3.5 w-3.5" />
                                            {RecurrentSlotUtils.getRecurrenceDescription(slot.daysOfWeek)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3.5 w-3.5" />
                                            {slot.startTime} · {RecurrentSlotUtils.formatDuration(slot.duration)}
                                        </span>
                                    </div>
                                    {slot.description && (
                                        <p className="text-xs text-[var(--color-text-muted)]">
                                            {slot.description}
                                        </p>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    <button
                                        className="app-btn app-btn-ghost p-2"
                                        title="Modifier"
                                        onClick={() => {
                                            setEditingSlot(slot);
                                            setDialogOpen(true);
                                        }}
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button
                                        className="app-btn app-btn-ghost p-2 hover:!text-[var(--color-danger)]"
                                        title="Supprimer"
                                        onClick={() => setDeleteConfirmId(slot.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>

                                    {/* Toggle switch */}
                                    <button
                                        role="switch"
                                        aria-checked={slot.isActive}
                                        className={`relative ml-2 inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none ${
                                            slot.isActive
                                                ? 'bg-[var(--color-accent)]'
                                                : 'bg-[var(--color-bar-track)]'
                                        }`}
                                        onClick={() => toggleRecurrentSlot(slot.id, !slot.isActive)}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                                                slot.isActive ? 'translate-x-5' : 'translate-x-0'
                                            }`}
                                        />
                                    </button>
                                    <span className="text-xs text-[var(--color-text-muted)]">
                                        {slot.isActive ? 'Actif' : 'Inactif'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Dialog création/édition */}
            <RecurrentSlotDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                slot={editingSlot}
                onSave={handleSaveSlot}
            />

            {/* Confirmation suppression */}
            {deleteConfirmId && (
                <div className="app-modal-backdrop" onClick={() => setDeleteConfirmId(null)}>
                    <div
                        className="app-modal-panel max-w-sm"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-6 text-center">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-danger-muted)] text-[var(--color-danger)]">
                                <Trash2 className="h-5 w-5" />
                            </div>
                            <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
                                Supprimer le créneau récurrent
                            </h3>
                            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                                Cette action est irréversible. Le créneau sera supprimé de toutes les semaines.
                            </p>
                        </div>
                        <div className="flex items-center justify-end gap-3 border-t border-[var(--color-border)] px-6 py-4">
                            <button
                                className="app-btn app-btn-secondary"
                                onClick={() => setDeleteConfirmId(null)}
                            >
                                Annuler
                            </button>
                            <button
                                className="app-btn"
                                style={{
                                    background: 'var(--color-danger)',
                                    color: '#fff',
                                    borderColor: 'var(--color-danger)',
                                }}
                                onClick={handleConfirmDelete}
                            >
                                Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
