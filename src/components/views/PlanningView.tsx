"use client";

import React, { useState, useMemo, useRef, useCallback, KeyboardEvent } from "react";
import * as chrono from "chrono-node";
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
} from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────────

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 8h → 21h

const TYPE_COLORS: Record<PlanningEventType, { card: string; dot: string; badge: string }> = {
    revision: {
        card: "border-l-[var(--color-accent)] bg-[var(--color-accent-muted)]",
        dot: "bg-[var(--color-accent)]",
        badge: "app-badge-accent",
    },
    cours: {
        card: "border-l-[var(--color-secondary)] bg-[var(--color-secondary-muted)]",
        dot: "bg-[var(--color-secondary)]",
        badge: "border-[var(--color-secondary-border)] bg-[var(--color-secondary-muted)] text-[var(--color-secondary)]",
    },
    exam: {
        card: "border-l-[var(--color-danger)] bg-[var(--color-danger-muted)]",
        dot: "bg-[var(--color-danger)]",
        badge: "border-[var(--color-danger-border)] bg-[var(--color-danger-muted)] text-[var(--color-danger)]",
    },
    perso: {
        card: "border-l-[var(--color-success)] bg-[var(--color-success-muted)]",
        dot: "bg-[var(--color-success)]",
        badge: "border-[var(--color-success-border)] bg-[var(--color-success-muted)] text-[var(--color-success)]",
    },
};

const ACTIVE_BAR_COLORS: Record<PlanningEventType, string> = {
    revision: "bg-[var(--color-accent)]",
    cours: "bg-[var(--color-secondary)]",
    exam: "bg-[var(--color-danger)]",
    perso: "bg-[var(--color-success)]",
};

type ViewMode = "week" | "recurrent" | "calendar";

// ─── NLP Parser (chrono-node) ─────────────────────────────────────────
// Retourne la date/heure parsée + le titre nettoyé.
// Retourne null sur la date si chrono ne trouve rien (fallback = date sélectionnée).

function parseNLPInput(input: string): { title: string; date: string | null; time?: string } {
    const results = chrono.fr.parse(input, new Date(), { forwardDate: true });

    if (results.length > 0) {
        const result = results[0];
        const date = result.start.date();
        const pad = (n: number) => String(n).padStart(2, "0");
        const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

        let time: string | undefined;
        if (result.start.isCertain("hour")) {
            const hh = pad(result.start.get("hour") ?? 0);
            const mm = pad(result.start.get("minute") ?? 0);
            time = `${hh}:${mm}`;
        }

        // Retire la partie date/heure du texte pour isoler le titre
        let title = input.replace(result.text, "").trim();
        title = title.replace(/^[\s,:-]+|[\s,:-]+$/g, "").replace(/\s+/g, " ");
        if (!title) title = input.trim();

        return { title, date: dateStr, time };
    }

    // Pas de date trouvée → titre = input brut, date = null (fallback sur date sélectionnée)
    return { title: input.trim(), date: null };
}

// ─── Helpers ─────────────────────────────────────────────────────────

function toISODate(d: Date): string {
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const day = d.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function addDays(d: Date, n: number): Date {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
}

const DAY_LABELS_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function formatWeekRange(start: Date): string {
    const end = addDays(start, 6);
    const months = [
        "janvier", "février", "mars", "avril", "mai", "juin",
        "juillet", "août", "septembre", "octobre", "novembre", "décembre",
    ];
    const sameMonth = start.getMonth() === end.getMonth();
    if (sameMonth) {
        return `${start.getDate()} au ${end.getDate()} ${months[start.getMonth()]} ${start.getFullYear()}`;
    }
    return `${start.getDate()} ${months[start.getMonth()]} au ${end.getDate()} ${months[end.getMonth()]} ${end.getFullYear()}`;
}

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

    const { events: agendaEvents, addEvent } = useEvents();

    const [viewMode, setViewMode] = useState<ViewMode>("week");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingSlot, setEditingSlot] = useState<RecurrentSlot | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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

    // Position calculator
    const getEventPosition = (startTime: string, duration: number) => {
        const [h, m] = startTime.split(":").map(Number);
        const startOffset = (h - 8) * 60 + m;
        const top = (startOffset / 60) * 4; // 4rem per hour
        const height = duration * 4;
        return { top: `${top}rem`, height: `${height}rem` };
    };

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

    const eventsForMonth = useMemo(() => {
        const pad = (n: number) => String(n).padStart(2, "0");
        const prefix = `${calMonth.year}-${pad(calMonth.month + 1)}-`;
        return agendaEvents.filter(e => e.date.startsWith(prefix));
    }, [agendaEvents, calMonth]);

    const eventsForDate = useCallback((dateStr: string) =>
        agendaEvents.filter(e => e.date === dateStr),
    [agendaEvents]);

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
                                                                    background: "var(--color-accent-muted)",
                                                                    color: "var(--color-accent)",
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
                                    {monthLabel} — {eventsForMonth.length} événement{eventsForMonth.length !== 1 ? "s" : ""}
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
                                                <div key={ev.id} className="flex items-start gap-2 py-2 border-b border-[var(--color-border)] last:border-0">
                                                    <div className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[12px] font-medium text-[var(--color-text-primary)] truncate">{ev.title}</p>
                                                        <p className="text-[10px] text-[var(--color-text-muted)]">
                                                            {ev.date}{ev.time ? ` · ${ev.time}` : ""}
                                                        </p>
                                                    </div>
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

                                {/* Time grid */}
                                <div className="relative">
                                    <div className="grid grid-cols-8">
                                        {/* Hours column */}
                                        <div className="border-r border-[var(--color-border)]">
                                            {HOURS.map(hour => (
                                                <div
                                                    key={hour}
                                                    className="flex h-16 items-start border-b border-[var(--color-border)] px-2 py-1"
                                                >
                                                    <span className="app-meta">{hour}:00</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Day columns */}
                                        {weekDays.map(day => (
                                            <div
                                                key={day.date}
                                                className="relative border-r border-[var(--color-border)] last:border-r-0"
                                            >
                                                {HOURS.map(hour => (
                                                    <div
                                                        key={hour}
                                                        className="h-16 border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-accent-muted)]"
                                                    />
                                                ))}

                                                {/* Events */}
                                                {weekEvents
                                                    .filter(e => e.date === day.date)
                                                    .map(event => {
                                                        const pos = getEventPosition(event.startTime, event.duration);
                                                        const colors = TYPE_COLORS[event.type];
                                                        return (
                                                            <div
                                                                key={event.id}
                                                                className={`absolute left-1 right-1 cursor-pointer rounded-lg border-l-[3px] p-2 transition-shadow hover:shadow-md ${colors.card}`}
                                                                style={{
                                                                    top: pos.top,
                                                                    height: pos.height,
                                                                }}
                                                            >
                                                                <div className="text-xs font-medium leading-tight text-[var(--color-text-primary)]">
                                                                    {event.title}
                                                                </div>
                                                                <div className="mt-1 flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
                                                                    <Clock className="h-3 w-3" />
                                                                    {event.startTime} · {RecurrentSlotUtils.formatDuration(event.duration)}
                                                                </div>
                                                                {event.isRecurrent && (
                                                                    <div className="mt-0.5 flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
                                                                        <Repeat className="h-3 w-3" />
                                                                        {event.recurrence}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        ))}
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
