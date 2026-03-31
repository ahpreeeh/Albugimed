"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { RecurrentSlot, PlanningEvent, Deadline, RecurrentSlotUtils } from "@/types/planning";

// ─── Storage Keys ────────────────────────────────────────────────────
const SLOTS_KEY = "albugi-planning-slots";
const EVENTS_KEY = "albugi-planning-events";
const DEADLINES_KEY = "albugi-planning-deadlines";

// ─── Context Interface ──────────────────────────────────────────────
interface PlanningContextType {
    // Recurrent slots
    recurrentSlots: RecurrentSlot[];
    addRecurrentSlot: (slot: Omit<RecurrentSlot, "id" | "createdAt">) => void;
    updateRecurrentSlot: (slot: RecurrentSlot) => void;
    deleteRecurrentSlot: (id: string) => void;
    toggleRecurrentSlot: (id: string, isActive: boolean) => void;

    // One-off events
    oneOffEvents: PlanningEvent[];
    addOneOffEvent: (event: Omit<PlanningEvent, "id">) => void;
    removeOneOffEvent: (id: string) => void;

    // Deadlines
    deadlines: Deadline[];
    addDeadline: (deadline: Omit<Deadline, "id">) => void;
    removeDeadline: (id: string) => void;

    // Computed: all events for a given week (recurrents expanded + one-offs)
    getEventsForWeek: (weekStartDate: Date) => PlanningEvent[];

    // Current week navigation
    currentWeekStart: Date;
    goToNextWeek: () => void;
    goToPrevWeek: () => void;
    goToToday: () => void;
}

const PlanningContext = createContext<PlanningContextType | undefined>(undefined);

export const usePlanning = () => {
    const ctx = useContext(PlanningContext);
    if (!ctx) throw new Error("usePlanning must be used within a PlanningProvider");
    return ctx;
};

// ─── Helpers ─────────────────────────────────────────────────────────

/** Get Monday of the week containing a date */
function getMonday(d: Date): Date {
    const date = new Date(d);
    const day = date.getDay(); // 0=Sun
    const diff = day === 0 ? -6 : 1 - day; // Monday = 1
    date.setDate(date.getDate() + diff);
    date.setHours(0, 0, 0, 0);
    return date;
}

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

// ─── Provider ────────────────────────────────────────────────────────

export const PlanningProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [recurrentSlots, setRecurrentSlots] = useState<RecurrentSlot[]>([]);
    const [oneOffEvents, setOneOffEvents] = useState<PlanningEvent[]>([]);
    const [deadlines, setDeadlines] = useState<Deadline[]>([]);
    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getMonday(new Date()));
    const [isInit, setIsInit] = useState(false);

    // ── Load from localStorage ───────────────────────────────────────
    useEffect(() => {
        try {
            const savedSlots = localStorage.getItem(SLOTS_KEY);
            if (savedSlots) setRecurrentSlots(JSON.parse(savedSlots));

            const savedEvents = localStorage.getItem(EVENTS_KEY);
            if (savedEvents) setOneOffEvents(JSON.parse(savedEvents));

            const savedDeadlines = localStorage.getItem(DEADLINES_KEY);
            if (savedDeadlines) setDeadlines(JSON.parse(savedDeadlines));
        } catch (e) {
            console.error("PlanningContext: failed to hydrate from localStorage", e);
        }
        setIsInit(true);
    }, []);

    // ── Persist ──────────────────────────────────────────────────────
    useEffect(() => {
        if (!isInit) return;
        localStorage.setItem(SLOTS_KEY, JSON.stringify(recurrentSlots));
    }, [recurrentSlots, isInit]);

    useEffect(() => {
        if (!isInit) return;
        localStorage.setItem(EVENTS_KEY, JSON.stringify(oneOffEvents));
    }, [oneOffEvents, isInit]);

    useEffect(() => {
        if (!isInit) return;
        localStorage.setItem(DEADLINES_KEY, JSON.stringify(deadlines));
    }, [deadlines, isInit]);

    // ── Recurrent Slot CRUD ──────────────────────────────────────────
    const addRecurrentSlot = useCallback((slot: Omit<RecurrentSlot, "id" | "createdAt">) => {
        const newSlot: RecurrentSlot = {
            ...slot,
            id: `rs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            createdAt: new Date().toISOString().split("T")[0],
        };
        setRecurrentSlots(prev => [...prev, newSlot]);
    }, []);

    const updateRecurrentSlot = useCallback((slot: RecurrentSlot) => {
        setRecurrentSlots(prev => prev.map(s => (s.id === slot.id ? slot : s)));
    }, []);

    const deleteRecurrentSlot = useCallback((id: string) => {
        setRecurrentSlots(prev => prev.filter(s => s.id !== id));
    }, []);

    const toggleRecurrentSlot = useCallback((id: string, isActive: boolean) => {
        setRecurrentSlots(prev => prev.map(s => (s.id === id ? { ...s, isActive } : s)));
    }, []);

    // ── One-off events CRUD ──────────────────────────────────────────
    const addOneOffEvent = useCallback((event: Omit<PlanningEvent, "id">) => {
        const newEvent: PlanningEvent = {
            ...event,
            id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        };
        setOneOffEvents(prev => [...prev, newEvent]);
    }, []);

    const removeOneOffEvent = useCallback((id: string) => {
        setOneOffEvents(prev => prev.filter(e => e.id !== id));
    }, []);

    // ── Deadlines CRUD ───────────────────────────────────────────────
    const addDeadline = useCallback((deadline: Omit<Deadline, "id">) => {
        const d: Deadline = {
            ...deadline,
            id: `dl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        };
        setDeadlines(prev => [...prev, d]);
    }, []);

    const removeDeadline = useCallback((id: string) => {
        setDeadlines(prev => prev.filter(d => d.id !== id));
    }, []);

    // ── Expand recurrent + one-off for a week ────────────────────────
    const getEventsForWeek = useCallback((weekStartDate: Date): PlanningEvent[] => {
        const result: PlanningEvent[] = [];
        // JS day mapping: weekDayNumbers[i] = JS getDay() value for that column
        // Monday=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6, Sun=0
        const weekDayMap = [1, 2, 3, 4, 5, 6, 0];

        for (let i = 0; i < 7; i++) {
            const dayDate = addDays(weekStartDate, i);
            const dateStr = toISODate(dayDate);
            const jsDayNum = weekDayMap[i]; // JS day number for this column

            // Expand active recurrent slots that match this day
            for (const slot of recurrentSlots) {
                if (!slot.isActive) continue;
                if (!slot.daysOfWeek.includes(jsDayNum)) continue;
                // Only show slots created on or before this date
                if (slot.createdAt > dateStr) continue;

                result.push({
                    id: `${slot.id}-${dateStr}`,
                    title: slot.title,
                    type: slot.type,
                    date: dateStr,
                    startTime: slot.startTime,
                    duration: slot.duration,
                    isRecurrent: true,
                    recurrence: RecurrentSlotUtils.getRecurrenceDescription(slot.daysOfWeek),
                    sourceSlotId: slot.id,
                });
            }

            // One-off events for this date
            for (const event of oneOffEvents) {
                if (event.date === dateStr) {
                    result.push(event);
                }
            }
        }

        return result;
    }, [recurrentSlots, oneOffEvents]);

    // ── Week navigation ──────────────────────────────────────────────
    const goToNextWeek = useCallback(() => {
        setCurrentWeekStart(prev => addDays(prev, 7));
    }, []);

    const goToPrevWeek = useCallback(() => {
        setCurrentWeekStart(prev => addDays(prev, -7));
    }, []);

    const goToToday = useCallback(() => {
        setCurrentWeekStart(getMonday(new Date()));
    }, []);

    return (
        <PlanningContext.Provider
            value={{
                recurrentSlots,
                addRecurrentSlot,
                updateRecurrentSlot,
                deleteRecurrentSlot,
                toggleRecurrentSlot,
                oneOffEvents,
                addOneOffEvent,
                removeOneOffEvent,
                deadlines,
                addDeadline,
                removeDeadline,
                getEventsForWeek,
                currentWeekStart,
                goToNextWeek,
                goToPrevWeek,
                goToToday,
            }}
        >
            {children}
        </PlanningContext.Provider>
    );
};
