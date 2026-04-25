"use client";

import React, { useState, useMemo, useRef, useCallback, KeyboardEvent } from "react";
import { usePlanning } from "@/context/PlanningContext";
import { useEvents } from "@/context/EventContext";
import type { AgendaEvent } from "@/context/EventContext";
import { RecurrentSlot, RecurrentSlotUtils, PlanningEventType } from "@/types/planning";
import { RecurrentSlotDialog } from "@/components/features/plan/RecurrentSlotDialog";
import {
    Calendar,
    Plus,
    Clock,
    Repeat,
    AlertCircle,
    Edit2,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Send,
    CalendarDays,
    Sparkles,
    BookOpen,
} from "lucide-react";
import { cn } from "@/shared/lib/cn";
import {
    parseNLPInput,
    toISODate,
    addDays,
    formatWeekRange,
    timeToMinutes,
    minutesToTime,
    timeToTop,
    durationToHeight,
    addHourHelper,
    layoutOverlaps,
} from "@/entities/planning/model";
import {
    START_HOUR,
    END_HOUR,
    HOUR_HEIGHT,
    GRID_HEIGHT,
    HOURS,
} from "@/entities/planning/types";
import type { GridItem, ModalData, ViewMode } from "@/entities/planning/types";
import { TYPE_COLORS, ACTIVE_BAR_COLORS } from "@/features/planning-grid/styles";
import { EventModal } from "@/features/planning-grid/EventModal";
import { GridBlock } from "@/features/planning-grid/GridBlock";

const DAY_LABELS_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

// EventModal et GridBlock vivent désormais dans @/features/planning-grid/
// (extraits Phase 5 step 5.4). Importés en haut de fichier.

// ─── Component ───────────────────────────────────────────────────────

export function PlanningView() {
    const {
        recurrentSlots,
        addRecurrentSlot,
        updateRecurrentSlot,
        deleteRecurrentSlot,
        toggleRecurrentSlot,
        getEventsForWeek,
        currentWeekStart,
        goToNextWeek,
        goToPrevWeek,
        goToToday,
        deadlines,
    } = usePlanning();

    const { events: agendaEvents, addEvent, removeEvent, updateEvent } = useEvents();

    const [viewMode, setViewMode] = useState<ViewMode>("week");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingSlot, setEditingSlot] = useState<RecurrentSlot | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const [draggedItem, setDraggedItem] = useState<GridItem | null>(null);
    const [modalData, setModalData] = useState<ModalData | null>(null);

    // ── Calendar (monthly) state ──────────────────────────────────────
    const [calMonth, setCalMonth] = useState(() => {
        const d = new Date();
        return { year: d.getFullYear(), month: d.getMonth() };
    });
    const [nlpInput, setNlpInput] = useState("");
    const [nlpFeedback, setNlpFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
    const nlpRef = useRef<HTMLInputElement>(null);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    const handleNLPSubmit = useCallback(() => {
        const raw = nlpInput.trim();
        if (!raw) return;
        const parsed = parseNLPInput(raw);

        // Si chrono n'a pas trouvé de date, on utilise la date sélectionnée dans le calendrier
        const finalDate = parsed.date ?? selectedDate;
        if (!finalDate) {
            setNlpFeedback({ ok: false, msg: "Sélectionnez un jour dans le calendrier ou précisez une date (ex: \"demain\", \"22 avril\")" });
            setTimeout(() => setNlpFeedback(null), 3000);
            return;
        }

        addEvent({ title: parsed.title, date: finalDate, time: parsed.time, type: 'event' });
        setNlpFeedback({ ok: true, msg: `✓ "${parsed.title}" ajouté le ${finalDate}${parsed.time ? ` à ${parsed.time}` : ""}` });
        setNlpInput("");
        setTimeout(() => setNlpFeedback(null), 3000);
    }, [nlpInput, addEvent, selectedDate]);

    const handleNLPKey = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") handleNLPSubmit();
    };

    // Week data
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

        // 2. Agenda events (including recurring ones)
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
                        id: `event-${ev.id}-${ds}`, // Unique ID per day for recurring
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

    // Grid interaction handlers
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
            // Can't edit recurrent events via this modal directly
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

    // Drag & Drop
    const handleDragStart = useCallback((e: React.DragEvent, item: GridItem) => {
        // Only allow dropping regular agenda events
        if (item.source !== 'event') return;
        setDraggedItem(item);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.id);
    }, []);

    const handleDrop = useCallback((targetDateStr: string) => {
        if (!draggedItem || draggedItem.source !== 'event') return;
        updateEvent(draggedItem.originalId, { date: targetDateStr });
        setDraggedItem(null);
    }, [draggedItem, updateEvent]);

    // Handlers
    const handleSaveSlot = (slotData: Omit<RecurrentSlot, "id" | "createdAt"> | RecurrentSlot) => {
        if ("id" in slotData) {
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

    const isCurrentWeek = toISODate(currentWeekStart) === toISODate(
        (() => {
            const d = new Date();
            const day = d.getDay();
            const diff = day === 0 ? -6 : 1 - day;
            d.setDate(d.getDate() + diff);
            d.setHours(0, 0, 0, 0);
            return d;
        })()
    );

    // ── Calendar: monthly grid data ───────────────────────────────────
    const calendarDays = useMemo(() => {
        const { year, month } = calMonth;
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        // Offset to Monday=0
        let startOffset = firstDay.getDay() - 1;
        if (startOffset < 0) startOffset = 6;
        const totalCells = startOffset + lastDay.getDate();
        const cells = Math.ceil(totalCells / 7) * 7;
        const pad = (n: number) => String(n).padStart(2, "0");
        const rows: { dateStr: string; day: number; isCurrentMonth: boolean; isToday: boolean }[][] = [];
        let current = new Date(year, month, 1 - startOffset);
        for (let r = 0; r < cells / 7; r++) {
            const row = [];
            for (let c = 0; c < 7; c++) {
                const d = new Date(current);
                const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
                const todayStr = `${new Date().getFullYear()}-${pad(new Date().getMonth() + 1)}-${pad(new Date().getDate())}`;
                row.push({
                    dateStr,
                    day: d.getDate(),
                    isCurrentMonth: d.getMonth() === month,
                    isToday: dateStr === todayStr,
                });
                current.setDate(current.getDate() + 1);
            }
            rows.push(row);
        }
        return rows;
    }, [calMonth]);

    const monthLabel = useMemo(() => {
        const months = [
            "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
            "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
        ];
        return `${months[calMonth.month]} ${calMonth.year}`;
    }, [calMonth]);

    // Unified calendar item for monthly view (agenda events + recurrent slots)
    type CalendarItem = { id: string; title: string; date: string; time?: string; source: 'event' | 'slot' };

    // Expand recurrent slots for a given date
    const getRecurrentSlotsForDate = useCallback((dateStr: string): CalendarItem[] => {
        const d = new Date(dateStr + 'T00:00:00');
        const jsDay = d.getDay(); // 0=Sun, 1=Mon...
        return recurrentSlots
            .filter(slot => slot.isActive && slot.daysOfWeek.includes(jsDay))
            .map(slot => ({
                id: `slot-${slot.id}-${dateStr}`,
                title: slot.title,
                date: dateStr,
                time: slot.startTime,
                source: 'slot' as const,
            }));
    }, [recurrentSlots]);

    const eventsForMonth = useMemo(() => {
        const pad = (n: number) => String(n).padStart(2, "0");
        const prefix = `${calMonth.year}-${pad(calMonth.month + 1)}-`;
        const agendaItems: CalendarItem[] = agendaEvents
            .filter(e => e.date.startsWith(prefix))
            .map(e => ({ id: e.id, title: e.title, date: e.date, time: e.time, source: 'event' as const }));

        // Expand recurrent slots for all days of the month
        const { year, month } = calMonth;
        const lastDay = new Date(year, month + 1, 0).getDate();
        const slotItems: CalendarItem[] = [];
        for (let d = 1; d <= lastDay; d++) {
            const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`;
            slotItems.push(...getRecurrentSlotsForDate(dateStr));
        }

        return [...agendaItems, ...slotItems];
    }, [agendaEvents, calMonth, getRecurrentSlotsForDate]);

    const eventsForDate = useCallback((dateStr: string): CalendarItem[] => {
        const agendaItems: CalendarItem[] = agendaEvents
            .filter(e => e.date === dateStr)
            .map(e => ({ id: e.id, title: e.title, date: e.date, time: e.time, source: 'event' as const }));
        return [...agendaItems, ...getRecurrentSlotsForDate(dateStr)];
    }, [agendaEvents, getRecurrentSlotsForDate]);

    return (
        <div className="mx-auto max-w-[1560px] space-y-6">
            {/* ── Header ──────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-[28px] font-semibold leading-none text-[var(--color-text-primary)]">
                        Planning
                    </h2>
                    <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                        Organisez votre semaine et gérez vos créneaux récurrents
                    </p>
                </div>
                <button
                    className="app-btn app-btn-primary"
                    onClick={() => {
                        setEditingSlot(null);
                        setDialogOpen(true);
                    }}
                >
                    <Plus className="h-4 w-4" />
                    Nouveau créneau
                </button>
            </div>

            {/* ── Tabs ────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="app-segmented">
                    <button
                        className="app-segmented-button"
                        data-active={viewMode === "week" ? "true" : "false"}
                        onClick={() => setViewMode("week")}
                    >
                        <Calendar className="h-3.5 w-3.5" />
                        <span className="hidden xs:inline">Vue hebdomadaire</span>
                        <span className="xs:hidden">Semaine</span>
                    </button>
                    <button
                        className="app-segmented-button"
                        data-active={viewMode === "calendar" ? "true" : "false"}
                        onClick={() => setViewMode("calendar")}
                    >
                        <CalendarDays className="h-3.5 w-3.5" />
                        <span className="hidden xs:inline">Vue mensuelle</span>
                        <span className="xs:hidden">Mois</span>
                    </button>
                    <button
                        className="app-segmented-button"
                        data-active={viewMode === "recurrent" ? "true" : "false"}
                        onClick={() => setViewMode("recurrent")}
                    >
                        <Repeat className="h-3.5 w-3.5" />
                        <span className="hidden xs:inline">Créneaux récurrents</span>
                        <span className="xs:hidden">Récurrents</span>
                        {recurrentSlots.filter(s => s.isActive).length > 0 && (
                            <span className="app-badge-accent ml-1">
                                {recurrentSlots.filter(s => s.isActive).length}
                            </span>
                        )}
                    </button>
                </div>

                {viewMode === "week" && (
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
                )}
                {viewMode === "calendar" && (
                    <div className="flex items-center gap-2">
                        <button className="app-btn app-btn-ghost p-2"
                            onClick={() => setCalMonth(p => {
                                const d = new Date(p.year, p.month - 1, 1);
                                return { year: d.getFullYear(), month: d.getMonth() };
                            })}>
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="min-w-[120px] sm:min-w-[140px] text-center text-sm font-semibold text-[var(--color-text-primary)]">
                            {monthLabel}
                        </span>
                        <button className="app-btn app-btn-ghost p-2"
                            onClick={() => setCalMonth(p => {
                                const d = new Date(p.year, p.month + 1, 1);
                                return { year: d.getFullYear(), month: d.getMonth() };
                            })}>
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* ── CALENDAR (MONTHLY) VIEW ──────────────────────────────────────── */}
            {viewMode === "calendar" && (
                <div className="flex flex-col" style={{ paddingBottom: "80px" }}>
                    <div className="flex flex-col lg:flex-row gap-5">
                        {/* ── Monthly Grid ── */}
                        <div className="flex-1 app-card overflow-hidden">
                            {/* Day headers */}
                            <div className="grid grid-cols-7 border-b border-[var(--color-border)]">
                                {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(d => (
                                    <div key={d} className="py-2.5 text-center text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                                        {d}
                                    </div>
                                ))}
                            </div>
                            {/* Day cells */}
                            <div className="divide-y divide-[var(--color-border)]">
                                {calendarDays.map((row, ri) => (
                                    <div key={ri} className="grid grid-cols-7 divide-x divide-[var(--color-border)]">
                                        {row.map(cell => {
                                            const dayEvents = eventsForDate(cell.dateStr);
                                            const isSelected = selectedDate === cell.dateStr;
                                            return (
                                                <div
                                                    key={cell.dateStr}
                                                    onClick={() => setSelectedDate(cell.dateStr)}
                                                    className={`min-h-[60px] sm:min-h-[90px] p-1 sm:p-2 transition-colors cursor-pointer ${
                                                        !cell.isCurrentMonth ? "opacity-30" : ""
                                                    } ${
                                                        isSelected ? "ring-2 ring-inset ring-[var(--color-accent)]" :
                                                        cell.isToday ? "bg-[var(--color-accent-muted)]" : "hover:bg-[var(--color-bg-active-nav)]"
                                                    }`}
                                                >
                                                    <div className={`text-[11px] font-semibold mb-1 w-5 h-5 flex items-center justify-center rounded-full ${
                                                        cell.isToday
                                                            ? "bg-[var(--color-accent)] text-white"
                                                            : "text-[var(--color-text-secondary)]"
                                                    }`}>
                                                        {cell.day}
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        {dayEvents.slice(0, 3).map(ev => (
                                                            <div key={ev.id}
                                                                className="truncate rounded px-1 py-0.5 text-[9px] font-medium"
                                                                style={{
                                                                    background: ev.source === 'slot' ? "var(--color-secondary-muted)" : "var(--color-accent-muted)",
                                                                    color: ev.source === 'slot' ? "var(--color-secondary)" : "var(--color-accent)",
                                                                }}>
                                                                {ev.time && <span className="mr-1 opacity-70">{ev.time}</span>}
                                                                {ev.title}
                                                            </div>
                                                        ))}
                                                        {dayEvents.length > 3 && (
                                                            <div className="text-[9px] text-[var(--color-text-hint)] pl-1">
                                                                +{dayEvents.length - 3}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ── Right Panel: Month summary ── */}
                        <div className="w-full lg:w-72 lg:shrink-0 space-y-3">
                            <div className="app-card p-4">
                                <h3 className="text-[12px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
                                    {monthLabel} — {eventsForMonth.length} élément{eventsForMonth.length !== 1 ? "s" : ""}
                                </h3>
                                {eventsForMonth.length === 0 ? (
                                    <div className="py-6 text-center">
                                        <CalendarDays className="h-8 w-8 text-[var(--color-text-hint)] mx-auto mb-2" />
                                        <p className="text-[11px] text-[var(--color-text-muted)]">
                                            Aucun événement ce mois-ci
                                        </p>
                                        <p className="text-[9px] text-[var(--color-text-hint)] mt-1">
                                            Utilisez la barre en bas pour en ajouter
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                                        {eventsForMonth
                                            .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""))
                                            .map(ev => (
                                                <div key={ev.id} className="group flex items-start gap-2 py-2 border-b border-[var(--color-border)] last:border-0">
                                                    <div className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${ev.source === 'slot' ? 'bg-[var(--color-secondary)]' : 'bg-[var(--color-accent)]'}`} />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1">
                                                            {ev.source === 'slot' && <Repeat className="h-2.5 w-2.5 text-[var(--color-secondary)] shrink-0" />}
                                                            <p className="text-[12px] font-medium text-[var(--color-text-primary)] truncate">{ev.title}</p>
                                                        </div>
                                                        <p className="text-[10px] text-[var(--color-text-muted)]">
                                                            {ev.date}{ev.time ? ` · ${ev.time}` : ""}
                                                        </p>
                                                    </div>
                                                    {ev.source === 'event' && (
                                                        <button
                                                            onClick={() => removeEvent(ev.id)}
                                                            className="mt-0.5 shrink-0 text-[var(--color-text-hint)] opacity-0 group-hover:opacity-100 hover:text-[var(--color-danger)] transition-all"
                                                            title="Supprimer"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── NLP Input Bar (fixed at bottom) ── */}
                    <div
                        className="fixed bottom-0 left-0 right-0 z-40 border-t px-6 py-3"
                        style={{
                            background: "var(--color-bg-nav, var(--color-bg-surface))",
                            borderColor: "var(--color-border)",
                        }}
                    >
                        <div className="mx-auto max-w-[1560px]">
                            {nlpFeedback && (
                                <div className={`mb-2 text-[11px] font-medium px-3 py-1.5 rounded-lg ${
                                    nlpFeedback.ok
                                        ? "bg-[var(--color-success-muted)] text-[var(--color-success)]"
                                        : "bg-[var(--color-danger-muted)] text-[var(--color-danger)]"
                                }`}>
                                    {nlpFeedback.msg}
                                </div>
                            )}
                            <div className="flex items-center gap-3">
                                <Sparkles className="h-4 w-4 shrink-0 text-[var(--color-accent)]" />
                                <input
                                    ref={nlpRef}
                                    value={nlpInput}
                                    onChange={e => setNlpInput(e.target.value)}
                                    onKeyDown={handleNLPKey}
                                    placeholder='Tapez un événement en français… ex: "rdv dentiste demain à 14h" ou "cours math le 13 mars à 18h"'
                                    className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] px-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-hint)] focus:border-[var(--color-accent)] focus:outline-none transition-colors"
                                />
                                <button
                                    onClick={handleNLPSubmit}
                                    disabled={!nlpInput.trim()}
                                    className="app-btn app-btn-primary flex items-center gap-1.5 disabled:opacity-40"
                                >
                                    <Send className="h-3.5 w-3.5" />
                                    Ajouter
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* ── WEEK VIEW ──────────────────────────────────────────── */}
            {viewMode === "week" && (
                <div className="space-y-4">
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
                                                day.isToday ? "bg-[var(--color-accent-muted)]" : "app-table-head"
                                            }`}
                                        >
                                            <div className={`text-sm font-medium ${
                                                day.isToday
                                                    ? "text-[var(--color-accent)]"
                                                    : "text-[var(--color-text-primary)]"
                                            }`}>
                                                {day.label}
                                            </div>
                                            <div className={`text-xs ${
                                                day.isToday
                                                    ? "font-bold text-[var(--color-accent)]"
                                                    : "text-[var(--color-text-muted)]"
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

                                                    {/* Fused event blocks (planning + agenda) with overlap layout */}
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
                        {(Object.entries(TYPE_COLORS) as [PlanningEventType, typeof TYPE_COLORS["revision"]][]).map(
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
            )}

            {/* ── RECURRENT SLOTS VIEW ────────────────────────────── */}
            {viewMode === "recurrent" && (
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
                                        slot.isActive ? "opacity-100" : "opacity-50"
                                    }`}
                                >
                                    {/* Color bar */}
                                    <div
                                        className={`mt-1 h-14 w-1 shrink-0 rounded-full ${
                                            slot.isActive
                                                ? ACTIVE_BAR_COLORS[slot.type]
                                                : "bg-[var(--color-bar-track)]"
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
                                                    ? "bg-[var(--color-accent)]"
                                                    : "bg-[var(--color-bar-track)]"
                                            }`}
                                            onClick={() => toggleRecurrentSlot(slot.id, !slot.isActive)}
                                        >
                                            <span
                                                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                                                    slot.isActive ? "translate-x-5" : "translate-x-0"
                                                }`}
                                            />
                                        </button>
                                        <span className="text-xs text-[var(--color-text-muted)]">
                                            {slot.isActive ? "Actif" : "Inactif"}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Upcoming Deadlines ──────────────────────────────── */}
            {deadlines.length > 0 && (
                <div>
                    <h3 className="app-section-title mb-3 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-[var(--color-danger)]" />
                        Échéances importantes à venir
                    </h3>
                    <div className="space-y-2">
                        {deadlines
                            .filter(d => d.date >= toISODate(new Date()))
                            .sort((a, b) => a.date.localeCompare(b.date))
                            .slice(0, 5)
                            .map(deadline => (
                                <div
                                    key={deadline.id}
                                    className={`app-card flex items-center justify-between p-3 ${
                                        deadline.type === "exam"
                                            ? "border-[var(--color-danger-border)] bg-[var(--color-danger-muted)]"
                                            : "border-[var(--color-priority-border)] bg-[var(--color-priority-muted)]"
                                    }`}
                                >
                                    <div>
                                        <div className="text-sm font-medium text-[var(--color-text-primary)]">
                                            {deadline.title}
                                        </div>
                                        <div className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                                            {deadline.date}
                                        </div>
                                    </div>
                                    <span
                                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                                            deadline.type === "exam"
                                                ? "border-[var(--color-danger-border)] bg-[var(--color-danger-muted)] text-[var(--color-danger)]"
                                                : "border-[var(--color-priority-border)] bg-[var(--color-priority-muted)] text-[var(--color-priority)]"
                                        }`}
                                    >
                                        {deadline.type === "exam" ? "Examen" : "Cours obligatoire"}
                                    </span>
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {/* ── Dialog: Event Modal (Agenda) ────────────────────── */}
            {modalData && (
                <EventModal
                    data={modalData}
                    onClose={() => setModalData(null)}
                    onSave={handleModalSave}
                    onDelete={handleModalDelete}
                />
            )}

            {/* ── Dialog: Recurrent Slot ──────────────────────────── */}
            <RecurrentSlotDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                slot={editingSlot}
                onSave={handleSaveSlot}
            />

            {/* ── Delete Confirmation ─────────────────────────────── */}
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
                                    background: "var(--color-danger)",
                                    color: "#fff",
                                    borderColor: "var(--color-danger)",
                                }}
                                onClick={handleConfirmDelete}
                            >
                                Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
