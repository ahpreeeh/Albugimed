"use client";

// ─── Planning page ───────────────────────────────────────────────────
// Route: /planning — agenda + planification (semaine, mois, récurrents).
// Orchestrateur fin : gère le viewMode courant et délègue aux 3 features.
// Avant Phase 5 Lot AA : ce rôle était tenu par
// `src/components/views/PlanningView.tsx` (1424 lig, supprimé en Lot AA).

import React, { useState } from 'react';
import { Calendar, Repeat, AlertCircle, CalendarDays } from 'lucide-react';
import { usePlanning } from '@/entities/planning/hooks';
import type { ViewMode } from '@/entities/planning/types';
import { PlanningGrid } from '@/features/planning-grid/PlanningGrid';
import { MonthlyCalendar } from '@/features/planning-calendar/MonthlyCalendar';
import { RecurrentSlotsList } from '@/features/planning-recurrent/RecurrentSlotsList';

export default function PlanningPage() {
    const { deadlines } = usePlanning();
    const [viewMode, setViewMode] = useState<ViewMode>('week');

    return (
        <div className="h-full">
            <div className="mx-auto max-w-[1560px] space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-[28px] font-semibold leading-none text-[var(--color-text-primary)]">
                            Planning
                        </h2>
                        <p className="mt-1.5 text-sm text-[var(--color-text-muted)]">
                            Vue d&apos;ensemble de votre semaine, mois, et créneaux récurrents
                        </p>
                    </div>

                    {deadlines.length > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                            <AlertCircle className="h-3.5 w-3.5 text-[var(--color-priority)]" />
                            {deadlines.length} échéance{deadlines.length > 1 ? 's' : ''}
                        </div>
                    )}
                </div>

                {/* View mode segmented control */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="app-segmented">
                        <button
                            className="app-segmented-button"
                            data-active={viewMode === 'week' ? 'true' : 'false'}
                            onClick={() => setViewMode('week')}
                        >
                            <Calendar className="h-3.5 w-3.5" />
                            Semaine
                        </button>
                        <button
                            className="app-segmented-button"
                            data-active={viewMode === 'calendar' ? 'true' : 'false'}
                            onClick={() => setViewMode('calendar')}
                        >
                            <CalendarDays className="h-3.5 w-3.5" />
                            Calendrier
                        </button>
                        <button
                            className="app-segmented-button"
                            data-active={viewMode === 'recurrent' ? 'true' : 'false'}
                            onClick={() => setViewMode('recurrent')}
                        >
                            <Repeat className="h-3.5 w-3.5" />
                            Récurrents
                        </button>
                    </div>
                </div>

                {/* View body — délégué à la feature correspondante */}
                {viewMode === 'week' && <PlanningGrid />}
                {viewMode === 'calendar' && <MonthlyCalendar />}
                {viewMode === 'recurrent' && <RecurrentSlotsList />}
            </div>
        </div>
    );
}
