"use client";

// ─── PlanningGrid ────────────────────────────────────────────────────
// Vue "Semaine" du planning : grille horaire avec colonnes par jour,
// blocs d'événements draggable, modal d'édition au clic.
// Extrait de PlanningView.tsx (Phase 5 step 5.5).
//
// Self-contained : utilise usePlanning + useEvents pour les données et
// la navigation semaine, gère son propre state (modalData, draggedItem).

import React, { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePlanning } from '@/entities/planning/hooks';
import { useEvents } from '@/context/EventContext';
import {
    addDays,
    toISODate,
    formatWeekRange,
    timeToTop,
    durationToHeight,
    addHourHelper,
    layoutOverlaps,
} from '@/entities/planning/model';
import {
    START_HOUR,
    END_HOUR,
    HOUR_HEIGHT,
    GRID_HEIGHT,
    HOURS,
    RecurrentSlotUtils,
} from '@/entities/planning/types';
import type {
    GridItem,
    ModalData,
    PlanningEventType,
} from '@/entities/planning/types';
import { TYPE_COLORS } from './styles';
import { GridBlock } from './GridBlock';
import { EventModal } from './EventModal';

const DAY_LABELS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export const PlanningGrid: React.FC = () => {
    const {
        getEventsForWeek,
        currentWeekStart,
        goToNextWeek,
        goToPrevWeek,
        goToToday,
    } = usePlanning();

    const { events: agendaEvents, addEvent, removeEvent, updateEvent } = useEvents();

    const [draggedItem, setDraggedItem] = useState<GridItem | null>(null);
    const [modalData, setModalData] = useState<ModalData | null>(null);

    // ── Week data ─────────────────────────────────────────────────────
    const weekDays = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => {
            const d = addDays(currentWeekStart, i);
            return {
                label: DAY_LABELS_SHORT[i],
                num: d.getDate().toString(),
                date: toISODate(d),
                isToday: toISODate(d) === toISODate(new Date()),
            };
        });
    }, [currentWeekStart]);

    const weekEvents = useMemo(
        () => getEventsForWeek(currentWeekStart),
        [getEventsForWeek, currentWeekStart],
    );

    const weekDateStrings = useMemo(() => weekDays.map(d => d.date), [weekDays]);

    const dayItems = useMemo((): Map<string, GridItem[]> => {
        const map = new Map<string, GridItem[]>();
        weekDateStrings.forEach(ds => map.set(ds, []));

        // 1. Planning recurrent events
        weekEvents.forEach(pe => {
            if (map.has(pe.date)) {
                const raw: GridItem = {
                    id: `plan-${pe.id}`,
                    originalId: pe.sourceSlotId || pe.id,
                    title: pe.title,
                    date: pe.date,
                    startTime: pe.startTime,
                    endTime: addHourHelper(pe.startTime, pe.duration),
                    isDefault: false,
                    source: 'plan',
                    type: pe.type,
                    top: timeToTop(pe.startTime),
                    height: durationToHeight(pe.startTime, addHourHelper(pe.startTime, pe.duration)),
                    left: 0,
                    width: 1,
                };
                map.get(pe.date)!.push(raw);
            }
        });

        // 2. Agenda events (including recurring weekly ones)
        weekDateStrings.forEach(ds => {
            const dateObj = new Date(ds);
            const dayOfWeek = dateObj.getDay();

            agendaEvents.forEach(ev => {
                let shouldInclude = false;
                if (ev.date === ds) {
                    shouldInclude = true;
                } else if (ev.recurrence === 'weekly') {
                    const evDate = new Date(ev.date);
                    if (evDate.getDay() === dayOfWeek && dateObj >= evDate) {
                        shouldInclude = true;
                    }
                }

                if (shouldInclude) {
                    const start = ev.time || '08:00';
                    const end = ev.endTime || addHourHelper(start);
                    const raw: GridItem = {
                        id: `event-${ev.id}-${ds}`,
                        originalId: ev.id,
                        title: ev.title,
                        date: ds,
                        startTime: start,
                        endTime: end,
                        isDefault: !ev.time,
                        source: 'event',
                        type: ev.type || 'event',
                        top: timeToTop(start),
                        height: durationToHeight(start, end),
                        left: 0,
                        width: 1,
                    };
                    map.get(ds)!.push(raw);
                }
            });
        });

        map.forEach((items, key) => {
            map.set(key, layoutOverlaps(items));
        });

        return map;
    }, [weekEvents, agendaEvents, weekDateStrings]);

    // ── Grid interaction handlers ─────────────────────────────────────
    const handleGridClick = useCallback((dateStr: string, e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const hour = Math.floor(y / HOUR_HEIGHT) + START_HOUR;
        const clampedHour = Math.max(START_HOUR, Math.min(hour, END_HOUR - 1));
        const startTime = `${String(clampedHour).padStart(2, '0')}:00`;

        setModalData({
            mode: 'create',
            date: dateStr,
            startTime,
            endTime: addHourHelper(startTime),
            title: '',
            type: 'event',
        });
    }, []);

    const handleBlockClick = useCallback((item: GridItem) => {
        if (item.source === 'plan') {
            // Pas d'édition directe des événements récurrents via cette modale
            return;
        }
        setModalData({
            mode: 'edit',
            date: item.date,
            startTime: item.startTime,
            endTime: item.endTime,
            title: item.title,
            type: item.type === 'task' ? 'task' : 'event',
            editId: item.originalId,
        });
    }, []);

    const handleModalSave = useCallback((data: ModalData) => {
        if (data.mode === 'create') {
            addEvent({
                title: data.title,
                date: data.date,
                time: data.startTime,
                endTime: data.endTime,
                type: data.type,
            });
        } else if (data.mode === 'edit' && data.editId) {
            updateEvent(data.editId, {
                title: data.title,
                time: data.startTime,
                endTime: data.endTime,
                type: data.type,
            });
        }
        setModalData(null);
    }, [addEvent, updateEvent]);

    const handleModalDelete = useCallback(() => {
        if (modalData?.editId) {
            removeEvent(modalData.editId);
        }
        setModalData(null);
    }, [modalData, removeEvent]);

    // ── Drag & drop ───────────────────────────────────────────────────
    const handleDragStart = useCallback((e: React.DragEvent, item: GridItem) => {
        if (item.source !== 'event') return;
        setDraggedItem(item);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.id);
    }, []);

    const handleDrop = useCallback((targetDate: string) => {
        if (!draggedItem || draggedItem.source !== 'event') return;
        // Met à jour la date de l'événement (originalId)
        updateEvent(draggedItem.originalId, { date: targetDate });
        setDraggedItem(null);
    }, [draggedItem, updateEvent]);

    // ── Header navigation ─────────────────────────────────────────────
    const isCurrentWeek = toISODate(currentWeekStart) === toISODate(
        (() => {
            const d = new Date();
            const day = d.getDay();
            const diff = day === 0 ? -6 : 1 - day;
            d.setDate(d.getDate() + diff);
            d.setHours(0, 0, 0, 0);
            return d;
        })(),
    );

    return (
        <>
            <div className="space-y-4">
                {/* Header navigation */}
                <div className="flex justify-end">
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        <button className="app-btn app-btn-ghost p-2" onClick={goToPrevWeek}>
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        {!isCurrentWeek && (
                            <button
                                className="app-btn app-btn-secondary text-xs"
                                onClick={goToToday}
                            >
                                Aujourd&apos;hui
                            </button>
                        )}
                        <span className="text-xs sm:text-sm font-medium text-[var(--color-text-secondary)]">
                            Semaine du {formatWeekRange(currentWeekStart)}
                        </span>
                        <button className="app-btn app-btn-ghost p-2" onClick={goToNextWeek}>
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="app-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <div className="min-w-[900px]">
                            {/* Day headers */}
                            <div className="grid grid-cols-8 border-b border-[var(--color-border)]">
                                <div className="app-table-head border-r border-[var(--color-border)] p-3" />
                                {weekDays.map(day => (
                                    <div
                                        key={day.date}
                                        className={`border-r border-[var(--color-border)] p-3 text-center last:border-r-0 ${
                                            day.isToday ? 'bg-[var(--color-accent-muted)]' : 'app-table-head'
                                        }`}
                                    >
                                        <div className={`text-sm font-medium ${
                                            day.isToday
                                                ? 'text-[var(--color-accent)]'
                                                : 'text-[var(--color-text-primary)]'
                                        }`}>
                                            {day.label}
                                        </div>
                                        <div className={`text-xs ${
                                            day.isToday
                                                ? 'font-bold text-[var(--color-accent)]'
                                                : 'text-[var(--color-text-muted)]'
                                        }`}>
                                            {day.num}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Time grid — pixel-based with overlap layout */}
                            <div className="overflow-y-auto max-h-[600px]">
                                <div className="flex" style={{ height: `${GRID_HEIGHT}px` }}>
                                    {/* Hours column */}
                                    <div className="w-14 shrink-0 relative border-r border-[var(--color-border)] bg-[var(--color-bg-tertiary)]">
                                        {HOURS.map(h => (
                                            <div
                                                key={h}
                                                className="absolute w-full flex items-start justify-end pr-2"
                                                style={{ top: `${(h - START_HOUR) * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                                            >
                                                <span className="text-[10px] font-mono text-[var(--color-text-muted)] -mt-[6px]">
                                                    {String(h).padStart(2, '0')}:00
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Day columns */}
                                    {weekDays.map(day => {
                                        const items = dayItems.get(day.date) || [];
                                        return (
                                            <div
                                                key={day.date}
                                                className={`flex-1 relative border-r border-[var(--color-border)] last:border-r-0 ${
                                                    day.isToday ? 'bg-[var(--color-accent-muted)]/10' : 'bg-[var(--color-bg-surface)]'
                                                }`}
                                                onClick={e => handleGridClick(day.date, e)}
                                                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                                                onDrop={e => { e.preventDefault(); handleDrop(day.date); }}
                                            >
                                                {/* Hour grid lines */}
                                                {HOURS.map(h => (
                                                    <div
                                                        key={h}
                                                        className="absolute w-full border-b border-[var(--color-border)]/50 hover:bg-[var(--color-accent-muted)]/20 transition-colors cursor-pointer"
                                                        style={{ top: `${(h - START_HOUR) * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                                                    />
                                                ))}

                                                {/* Current time indicator */}
                                                {day.isToday && (() => {
                                                    const now = new Date();
                                                    const top = ((now.getHours() + now.getMinutes() / 60) - START_HOUR) * HOUR_HEIGHT;
                                                    if (top < 0 || top > GRID_HEIGHT) return null;
                                                    return (
                                                        <div
                                                            className="absolute left-0 right-0 z-30 pointer-events-none"
                                                            style={{ top: `${top}px` }}
                                                        >
                                                            <div className="relative">
                                                                <div className="absolute -left-1 -top-[4px] w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]" />
                                                                <div className="h-[2px] bg-red-500/60 w-full" />
                                                            </div>
                                                        </div>
                                                    );
                                                })()}

                                                {/* Event blocks */}
                                                {items.map(item => (
                                                    <GridBlock
                                                        key={item.id}
                                                        item={item}
                                                        onClick={handleBlockClick}
                                                        onDragStart={handleDragStart}
                                                    />
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-5 text-sm">
                    <span className="app-kicker">Légende</span>
                    {(Object.entries(TYPE_COLORS) as [PlanningEventType, typeof TYPE_COLORS['revision']][]).map(
                        ([type, colors]) => (
                            <div key={type} className="flex items-center gap-1.5">
                                <div className={`h-2.5 w-2.5 rounded-full ${colors.dot}`} />
                                <span className="text-xs text-[var(--color-text-secondary)]">
                                    {RecurrentSlotUtils.typeLabels[type]}
                                </span>
                            </div>
                        ),
                    )}
                </div>
            </div>

            {/* Edit modal */}
            {modalData && (
                <EventModal
                    data={modalData}
                    onClose={() => setModalData(null)}
                    onSave={handleModalSave}
                    onDelete={handleModalDelete}
                />
            )}
        </>
    );
};
