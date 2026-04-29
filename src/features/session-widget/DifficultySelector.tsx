"use client";

import type { DifficultyRating } from '@/entities/session/types';
import { difficultyColor } from '@/entities/session/types';

interface DifficultySelectorProps {
    onRate: (rating: DifficultyRating) => void;
}

export const DifficultySelector = ({ onRate }: DifficultySelectorProps) => {
    const ratings: { value: DifficultyRating; label: string }[] = [
        { value: 'blue', label: 'Facile' },
        { value: 'green', label: 'OK' },
        { value: 'orange', label: 'Difficile' },
        { value: 'red', label: 'Très dur' },
    ];

    return (
        <div className="space-y-2">
            <p className="text-[10px] font-medium text-[var(--color-text-muted)]">
                Comment avez-vous trouvé ?
            </p>
            <div className="flex gap-1.5">
                {ratings.map(r => (
                    <button key={r.value}
                        onClick={() => onRate(r.value)}
                        className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold text-white transition-all hover:scale-105"
                        style={{ backgroundColor: difficultyColor(r.value) }}>
                        {r.label}
                    </button>
                ))}
            </div>
        </div>
    );
};
