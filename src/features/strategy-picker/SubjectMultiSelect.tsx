"use client";

import type { Subject } from '@/entities/subject/hooks';
import { cn } from '@/shared/lib/cn';

interface SubjectMultiSelectProps {
    label: string;
    subjects: Subject[];
    selectedIds: string[];
    onToggle: (id: string) => void;
}

export const SubjectMultiSelect = ({
    label,
    subjects,
    selectedIds,
    onToggle,
}: SubjectMultiSelectProps) => (
    <div>
        <label className="text-[11px] font-medium text-[var(--color-text-secondary)] mb-1.5 block">
            {label} <span className="text-[var(--color-danger)]">*</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
            {subjects.map(subject => (
                <button key={subject.id}
                    onClick={() => onToggle(subject.id)}
                    className={cn(
                        "px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all",
                        selectedIds.includes(subject.id)
                            ? "app-btn-primary text-white"
                            : "app-btn-secondary"
                    )}>
                    {subject.title}
                </button>
            ))}
            {subjects.length === 0 && (
                <p className="text-[10px] text-[var(--color-text-hint)]">
                    Aucune matière — ajoutez-en dans la section Matières
                </p>
            )}
        </div>
        {selectedIds.length > 0 && (
            <p className="text-[10px] text-[var(--color-text-muted)] mt-1.5">
                {selectedIds.length} matière{selectedIds.length > 1 ? 's' : ''} sélectionnée{selectedIds.length > 1 ? 's' : ''}
            </p>
        )}
    </div>
);
