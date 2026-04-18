"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { RecurrentSlot, PlanningEvent, Deadline, RecurrentSlotUtils } from "@/types/planning";
import { useCloudValue } from "@/shared/hooks/useCloudValue";

// ─── Storage Keys ─────────────────────────────────────────────────────
const SLOTS_KEY     = "albugi-planning-slots";
const EVENTS_KEY    = "albugi-planning-events";
const DEADLINES_KEY = "albugi-planning-deadlines";

// ─── Context Interface ────────────────────────────────────────────────
interface PlanningContextType {
    recurrentSlots: RecurrentSlot[];
    addRecurrentSlot: (slot: Omit<RecurrentSlot, "id" | "createdAt">) => void;
    updateRecurrentSlot: (slot: RecurrentSlot) => void;
    deleteRecurrentSlot: (id: string) => void;
    toggleRecurrentSlot: (id: string, isActive: boolean) => void;

    oneOffEvents: PlanningEvent[];
    addOneOffEvent: (event: Omit<PlanningEvent, "id">) => void;
    removeOneOffEvent: (id: string) => void;

    deadlines: Deadline[];
    addDeadline: (deadline: Omit<Deadline, "id">) => void;
    removeDeadline: (id: string) => void;

    getEventsForWeek: (weekStartDate: Date) => PlanningEvent[];

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

// ─── Helpers ──────────────────────────────────────────────────────────
function getMonday(d: Date): Date {
    const date = new Date(d);
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
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

// ─── Provider ─────────────────────────────────────────────────────────
export const PlanningProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { data: savedSlots,     saveWith: saveSlots     } = useCloudValue<RecurrentSlot[]>(SLOTS_KEY,     []);
    const { data: savedEvents,    saveWith: saveEvents    } = useCloudValue<PlanningEvent[]>(EVENTS_KEY,    []);
    const { data: savedDeadlines, saveWith: saveDeadlines } = useCloudValue<Deadline[]>(DEADLINES_KEY, []);

    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getMonday(new Date()));

    // ── Recurrent Slots CRUD ──────────────────────────────────────────
    const addRecurrentSlot = useCallback((slot: Omit<RecurrentSlot, "id" | "createdAt">) => {
        const newSlot: RecurrentSlot = {
            ...slot,
            id: `rs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            createdAt: new Date().toISOString().split("T")[0],
        };
        saveSlots(prev => [...prev, newSlot]);
    }, [saveSlots]);

    const updateRecurrentSlot = useCallback((slot: RecurrentSlot) => {
        saveSlots(prev => prev.map(s => s.id === slot.id ? slot : s));
    }, [saveSlots]);

    const deleteRecurrentSlot = useCallback((id: string) => {
        saveSlots(prev => prev.filter(s => s.id !== id));
    }, [saveSlots]);

    const toggleRecurrentSlot = useCallback((id: string, isActive: boolean) => {
        saveSlots(prev => prev.map(s => s.id === id ? { ...s, isActive } : s));
    }, [saveSlots]);

    // ── One-off Events CRUD ───────────────────────────────────────────
    const addOneOffEvent = useCallback((event: Omit<PlanningEvent, "id">) => {
        const newEvent: PlanningEvent = {
            ...event,
            id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        };
        saveEvents(prev => [...prev, newEvent]);
    }, [saveEvents]);

    const removeOneOffEvent = useCallback((id: string) => {
        saveEvents(prev => prev.filter(e => e.id !== id));
    }, [saveEvents]);

    // ── Deadlines CRUD ────────────────────────────────────────────────
    const addDeadline = useCallback((deadline: Omit<Deadline, "id">) => {
        const d: Deadline = {
            ...deadline,
            id: `dl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        };
        saveDeadlines(prev => [...prev, d]);
    }, [saveDeadlines]);

    const removeDeadline = useCallback((id: string) => {
        saveDeadlines(prev => prev.filter(d => d.id !== id));
    }, [saveDeadlines]);

    // ── Expand recurrent + one-off for a week ─────────────────────────
    const getEventsForWeek = useCallback((weekStartDate: Date): PlanningEvent[] => {
        const result: PlanningEvent[] = [];
        const weekDayMap = [1, 2, 3, 4, 5, 6, 0];

        for (let i = 0; i < 7; i++) {
            const dayDate = addDays(weekStartDate, i);
            const dateStr = toISODate(dayDate);
            const jsDayNum = weekDayMap[i];

            for (const slot of savedSlots) {
                if (!slot.isActive) continue;
                if (!slot.daysOfWeek.includes(jsDayNum)) continue;
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

            for (const event of savedEvents) {
                if (event.date === dateStr) result.push(event);
            }
        }
        return result;
    }, [savedSlots, savedEvents]);

    // ── Week navigation ───────────────────────────────────────────────
    const goToNextWeek = useCallback(() => setCurrentWeekStart(prev => addDays(prev, 7)), []);
    const goToPrevWeek = useCallback(() => setCurrentWeekStart(prev => addDays(prev, -7)), []);
    const goToToday    = useCallback(() => setCurrentWeekStart(getMonday(new Date())), []);

    return (
        <PlanningContext.Provider value={{
            recurrentSlots: savedSlots,
            addRecurrentSlot,
            updateRecurrentSlot,
            deleteRecurrentSlot,
            toggleRecurrentSlot,
            oneOffEvents: savedEvents,
            addOneOffEvent,
            removeOneOffEvent,
            deadlines: savedDeadlines,
            addDeadline,
            removeDeadline,
            getEventsForWeek,
            currentWeekStart,
            goToNextWeek,
            goToPrevWeek,
            goToToday,
        }}>
            {children}
        </PlanningContext.Provider>
    );
};
