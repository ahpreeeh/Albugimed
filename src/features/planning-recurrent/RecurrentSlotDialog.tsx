"use client";

import React, { useState, useEffect } from "react";
import { RecurrentSlot, PlanningEventType, RecurrentSlotUtils } from "@/entities/planning/types";
import { X } from "lucide-react";

interface RecurrentSlotDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    slot: RecurrentSlot | null; // null = create mode
    onSave: (slot: Omit<RecurrentSlot, "id" | "createdAt"> | RecurrentSlot) => void;
}

const ALL_DAYS = [
    { value: 1, label: "Lun" },
    { value: 2, label: "Mar" },
    { value: 3, label: "Mer" },
    { value: 4, label: "Jeu" },
    { value: 5, label: "Ven" },
    { value: 6, label: "Sam" },
    { value: 0, label: "Dim" },
];

const EVENT_TYPES: { value: PlanningEventType; label: string }[] = [
    { value: "revision", label: "Révision" },
    { value: "cours", label: "Cours" },
    { value: "exam", label: "Examen" },
    { value: "perso", label: "Personnel" },
];

const DURATION_OPTIONS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4];

export function RecurrentSlotDialog({ open, onOpenChange, slot, onSave }: RecurrentSlotDialogProps) {
    const [title, setTitle] = useState("");
    const [type, setType] = useState<PlanningEventType>("revision");
    const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
    const [startTime, setStartTime] = useState("09:00");
    const [duration, setDuration] = useState(1);
    const [description, setDescription] = useState("");
    const [isActive, setIsActive] = useState(true);

    const isEditing = !!slot;

    // Reset form on open/slot change
    useEffect(() => {
        if (open && slot) {
            setTitle(slot.title);
            setType(slot.type);
            setDaysOfWeek([...slot.daysOfWeek]);
            setStartTime(slot.startTime);
            setDuration(slot.duration);
            setDescription(slot.description || "");
            setIsActive(slot.isActive);
        } else if (open) {
            setTitle("");
            setType("revision");
            setDaysOfWeek([]);
            setStartTime("09:00");
            setDuration(1);
            setDescription("");
            setIsActive(true);
        }
    }, [open, slot]);

    const toggleDay = (day: number) => {
        setDaysOfWeek(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || daysOfWeek.length === 0) return;

        if (isEditing && slot) {
            onSave({
                ...slot,
                title: title.trim(),
                type,
                daysOfWeek,
                startTime,
                duration,
                description: description.trim() || undefined,
                isActive,
            });
        } else {
            onSave({
                title: title.trim(),
                type,
                daysOfWeek,
                startTime,
                duration,
                description: description.trim() || undefined,
                isActive,
            });
        }
        onOpenChange(false);
    };

    const isValid = title.trim().length > 0 && daysOfWeek.length > 0;

    if (!open) return null;

    return (
        <div className="app-modal-backdrop" onClick={() => onOpenChange(false)}>
            <div
                className="app-modal-panel max-w-lg"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
                    <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)]">
                        {isEditing ? "Modifier le créneau" : "Nouveau créneau récurrent"}
                    </h3>
                    <button
                        onClick={() => onOpenChange(false)}
                        className="app-btn-ghost rounded-lg p-1.5 hover:bg-[var(--color-accent-soft)]"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
                    {/* Title */}
                    <div>
                        <label className="app-kicker mb-1.5 block">Titre</label>
                        <input
                            className="app-input"
                            placeholder="Ex: Cardiologie — Révision"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {/* Type */}
                    <div>
                        <label className="app-kicker mb-1.5 block">Type</label>
                        <div className="app-segmented w-full">
                            {EVENT_TYPES.map(t => (
                                <button
                                    key={t.value}
                                    type="button"
                                    className="app-segmented-button flex-1"
                                    data-active={type === t.value ? "true" : "false"}
                                    onClick={() => setType(t.value)}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Days */}
                    <div>
                        <label className="app-kicker mb-1.5 block">
                            Jours de la semaine
                        </label>
                        <div className="flex gap-2">
                            {ALL_DAYS.map(d => (
                                <button
                                    key={d.value}
                                    type="button"
                                    onClick={() => toggleDay(d.value)}
                                    className={`flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-medium transition-all ${
                                        daysOfWeek.includes(d.value)
                                            ? "border-[var(--color-accent-border)] bg-[var(--color-accent)] text-white"
                                            : "border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-active)]"
                                    }`}
                                >
                                    {d.label}
                                </button>
                            ))}
                        </div>
                        {daysOfWeek.length > 0 && (
                            <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">
                                {RecurrentSlotUtils.getRecurrenceDescription(daysOfWeek)}
                            </p>
                        )}
                    </div>

                    {/* Time & Duration */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="app-kicker mb-1.5 block">Heure de début</label>
                            <input
                                type="time"
                                className="app-input"
                                value={startTime}
                                onChange={e => setStartTime(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="app-kicker mb-1.5 block">Durée</label>
                            <select
                                className="app-input w-full appearance-none"
                                value={duration}
                                onChange={e => setDuration(Number(e.target.value))}
                            >
                                {DURATION_OPTIONS.map(d => (
                                    <option key={d} value={d}>
                                        {RecurrentSlotUtils.formatDuration(d)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Preview */}
                    {daysOfWeek.length > 0 && (
                        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-streak)] p-3">
                            <p className="app-meta">
                                ↳ {startTime} → {RecurrentSlotUtils.getEndTime(startTime, duration)}
                                {" · "}
                                {RecurrentSlotUtils.formatDuration(duration)} par session
                            </p>
                        </div>
                    )}

                    {/* Description */}
                    <div>
                        <label className="app-kicker mb-1.5 block">
                            Description <span className="text-[var(--color-text-hint)]">(optionnel)</span>
                        </label>
                        <textarea
                            className="app-input min-h-[72px] resize-none"
                            placeholder="Notes, lien du cours..."
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={2}
                        />
                    </div>
                </form>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 border-t border-[var(--color-border)] px-6 py-4">
                    <button
                        type="button"
                        className="app-btn app-btn-secondary"
                        onClick={() => onOpenChange(false)}
                    >
                        Annuler
                    </button>
                    <button
                        type="button"
                        className="app-btn app-btn-primary"
                        disabled={!isValid}
                        style={{ opacity: isValid ? 1 : 0.5 }}
                        onClick={handleSubmit as unknown as React.MouseEventHandler}
                    >
                        {isEditing ? "Enregistrer" : "Créer le créneau"}
                    </button>
                </div>
            </div>
        </div>
    );
}
