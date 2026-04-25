"use client";

// ─── MonthlyCalendar ─────────────────────────────────────────────────
// Vue "Calendrier" du planning : grille mensuelle + panneau résumé +
// barre NLP en bas pour ajouter rapidement un événement.
// Extrait de PlanningView.tsx (Phase 5 step 5.5).
//
// Self-contained : utilise usePlanning + useEvents pour les données,
// gère son propre state (mois courant, jour sélectionné, input NLP).

import React, { useState, useMemo, useRef, useCallback, type KeyboardEvent } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    CalendarDays,
    Repeat,
    Trash2,
    Send,
    Sparkles,
} from 'lucide-react';
import { usePlanning } from '@/entities/planning/hooks';
import { useEvents } from '@/context/EventContext';
import { parseNLPInput } from '@/entities/planning/model';

interface CalendarItem {
    id: string;
    title: string;
    date: string;
    time?: string;
    source: 'event' | 'slot';
}

export const MonthlyCalendar: React.FC = () => {
    const { recurrentSlots } = usePlanning();
    const { events: agendaEvents, addEvent, removeEvent } = useEvents();

    const [calMonth, setCalMonth] = useState(() => {
        const d = new Date();
        return { year: d.getFullYear(), month: d.getMonth() };
    });
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [nlpInput, setNlpInput] = useState('');
    const [nlpFeedback, setNlpFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
    const nlpRef = useRef<HTMLInputElement>(null);

    // ── Calendar grid data ────────────────────────────────────────────
    const calendarDays = useMemo(() => {
        const { year, month } = calMonth;
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        let startOffset = firstDay.getDay() - 1;
        if (startOffset < 0) startOffset = 6;
        const totalCells = startOffset + lastDay.getDate();
        const cells = Math.ceil(totalCells / 7) * 7;
        const pad = (n: number) => String(n).padStart(2, '0');
        const rows: { dateStr: string; day: number; isCurrentMonth: boolean; isToday: boolean }[][] = [];
        const current = new Date(year, month, 1 - startOffset);
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
            'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
            'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
        ];
        return `${months[calMonth.month]} ${calMonth.year}`;
    }, [calMonth]);

    const getRecurrentSlotsForDate = useCallback((dateStr: string): CalendarItem[] => {
        const d = new Date(dateStr + 'T00:00:00');
        const jsDay = d.getDay();
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
        const pad = (n: number) => String(n).padStart(2, '0');
        const prefix = `${calMonth.year}-${pad(calMonth.month + 1)}-`;
        const agendaItems: CalendarItem[] = agendaEvents
            .filter(e => e.date.startsWith(prefix))
            .map(e => ({ id: e.id, title: e.title, date: e.date, time: e.time, source: 'event' as const }));

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

    // ── NLP handler ───────────────────────────────────────────────────
    const handleNLPSubmit = useCallback(() => {
        const raw = nlpInput.trim();
        if (!raw) return;
        const parsed = parseNLPInput(raw);

        const finalDate = parsed.date ?? selectedDate;
        if (!finalDate) {
            setNlpFeedback({ ok: false, msg: 'Sélectionnez un jour dans le calendrier ou précisez une date (ex: "demain", "22 avril")' });
            setTimeout(() => setNlpFeedback(null), 3000);
            return;
        }

        addEvent({ title: parsed.title, date: finalDate, time: parsed.time, type: 'event' });
        setNlpFeedback({ ok: true, msg: `✓ "${parsed.title}" ajouté le ${finalDate}${parsed.time ? ` à ${parsed.time}` : ''}` });
        setNlpInput('');
        setTimeout(() => setNlpFeedback(null), 3000);
    }, [nlpInput, addEvent, selectedDate]);

    const handleNLPKey = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleNLPSubmit();
    };

    // ── Header navigation ─────────────────────────────────────────────
    const goPrevMonth = () => setCalMonth(p => {
        const d = new Date(p.year, p.month - 1, 1);
        return { year: d.getFullYear(), month: d.getMonth() };
    });
    const goNextMonth = () => setCalMonth(p => {
        const d = new Date(p.year, p.month + 1, 1);
        return { year: d.getFullYear(), month: d.getMonth() };
    });

    // ── Render ────────────────────────────────────────────────────────
    return (
        <div className="space-y-4">
            {/* Header navigation */}
            <div className="flex justify-end">
                <div className="flex items-center gap-2">
                    <button className="app-btn app-btn-ghost p-2" onClick={goPrevMonth}>
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="min-w-[120px] sm:min-w-[140px] text-center text-sm font-semibold text-[var(--color-text-primary)]">
                        {monthLabel}
                    </span>
                    <button className="app-btn app-btn-ghost p-2" onClick={goNextMonth}>
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="flex flex-col" style={{ paddingBottom: '80px' }}>
                <div className="flex flex-col lg:flex-row gap-5">
                    {/* Monthly grid */}
                    <div className="flex-1 app-card overflow-hidden">
                        <div className="grid grid-cols-7 border-b border-[var(--color-border)]">
                            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
                                <div key={d} className="py-2.5 text-center text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                                    {d}
                                </div>
                            ))}
                        </div>
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
                                                    !cell.isCurrentMonth ? 'opacity-30' : ''
                                                } ${
                                                    isSelected ? 'ring-2 ring-inset ring-[var(--color-accent)]' :
                                                    cell.isToday ? 'bg-[var(--color-accent-muted)]' : 'hover:bg-[var(--color-bg-active-nav)]'
                                                }`}
                                            >
                                                <div className={`text-[11px] font-semibold mb-1 w-5 h-5 flex items-center justify-center rounded-full ${
                                                    cell.isToday
                                                        ? 'bg-[var(--color-accent)] text-white'
                                                        : 'text-[var(--color-text-secondary)]'
                                                }`}>
                                                    {cell.day}
                                                </div>
                                                <div className="space-y-0.5">
                                                    {dayEvents.slice(0, 3).map(ev => (
                                                        <div
                                                            key={ev.id}
                                                            className="truncate rounded px-1 py-0.5 text-[9px] font-medium"
                                                            style={{
                                                                background: ev.source === 'slot' ? 'var(--color-secondary-muted)' : 'var(--color-accent-muted)',
                                                                color: ev.source === 'slot' ? 'var(--color-secondary)' : 'var(--color-accent)',
                                                            }}
                                                        >
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

                    {/* Right panel: month summary */}
                    <div className="w-full lg:w-72 lg:shrink-0 space-y-3">
                        <div className="app-card p-4">
                            <h3 className="text-[12px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
                                {monthLabel} — {eventsForMonth.length} élément{eventsForMonth.length !== 1 ? 's' : ''}
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
                                        .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))
                                        .map(ev => (
                                            <div key={ev.id} className="group flex items-start gap-2 py-2 border-b border-[var(--color-border)] last:border-0">
                                                <div className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${ev.source === 'slot' ? 'bg-[var(--color-secondary)]' : 'bg-[var(--color-accent)]'}`} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1">
                                                        {ev.source === 'slot' && <Repeat className="h-2.5 w-2.5 text-[var(--color-secondary)] shrink-0" />}
                                                        <p className="text-[12px] font-medium text-[var(--color-text-primary)] truncate">{ev.title}</p>
                                                    </div>
                                                    <p className="text-[10px] text-[var(--color-text-muted)]">
                                                        {ev.date}{ev.time ? ` · ${ev.time}` : ''}
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

                {/* NLP input bar (fixed at bottom) */}
                <div
                    className="fixed bottom-0 left-0 right-0 z-40 border-t px-6 py-3"
                    style={{
                        background: 'var(--color-bg-nav, var(--color-bg-surface))',
                        borderColor: 'var(--color-border)',
                    }}
                >
                    <div className="mx-auto max-w-[1560px]">
                        {nlpFeedback && (
                            <div className={`mb-2 text-[11px] font-medium px-3 py-1.5 rounded-lg ${
                                nlpFeedback.ok
                                    ? 'bg-[var(--color-success-muted)] text-[var(--color-success)]'
                                    : 'bg-[var(--color-danger-muted)] text-[var(--color-danger)]'
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
        </div>
    );
};
