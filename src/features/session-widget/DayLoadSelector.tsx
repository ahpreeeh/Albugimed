"use client";

import React from 'react';
import { Target, Zap, Trophy } from 'lucide-react';
import type { DayLoad } from '@/entities/strategy/types';

interface DayLoadSelectorProps {
    onSelect: (load: DayLoad) => void;
}

export const DayLoadSelector = ({ onSelect }: DayLoadSelectorProps) => {
    const loads: { value: DayLoad; label: string; sub: string; icon: React.ReactNode }[] = [
        { value: 'plancher', label: 'Plancher', sub: 'Léger', icon: <Target className="h-4 w-4" /> },
        { value: 'standard', label: 'Standard', sub: 'Équilibré', icon: <Zap className="h-4 w-4" /> },
        { value: 'plafond', label: 'Plafond', sub: 'Intensif', icon: <Trophy className="h-4 w-4" /> },
    ];

    return (
        <div className="space-y-3">
            <p className="text-[11px] font-medium text-[var(--color-text-secondary)]">
                Quelle journée souhaitez-vous ?
            </p>
            <div className="grid grid-cols-3 gap-2">
                {loads.map(l => (
                    <button key={l.value}
                        onClick={() => onSelect(l.value)}
                        className="app-card p-3 flex flex-col items-center gap-1.5 hover:border-[var(--color-accent)] transition-all cursor-pointer group">
                        <div className="text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] transition-colors">
                            {l.icon}
                        </div>
                        <span className="text-[12px] font-semibold text-[var(--color-text-primary)]">{l.label}</span>
                        <span className="text-[10px] text-[var(--color-text-muted)]">{l.sub}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};
