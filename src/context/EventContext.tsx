"use client";

import React, { createContext, useContext, useCallback } from 'react';
import { validateEvents } from '@/lib/validators';
import { useCloudStorage } from '@/hooks/useCloudStorage';

export interface AgendaEvent {
    id: string;
    title: string;
    date: string;       // YYYY-MM-DD
    time?: string;      // HH:mm
    endTime?: string;
    type?: 'event' | 'task';
    recurrence?: 'none' | 'weekly';
}

interface EventContextType {
    events: AgendaEvent[];
    addEvent: (event: Omit<AgendaEvent, 'id'>) => void;
    removeEvent: (id: string) => void;
    updateEvent: (id: string, updates: Partial<Omit<AgendaEvent, 'id'>>) => void;
    getEventsForDate: (date: string) => AgendaEvent[];
    getEventsForWeek: (weekStart: Date) => Map<string, AgendaEvent[]>;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export const useEvents = () => {
    const context = useContext(EventContext);
    if (!context) throw new Error('useEvents must be used within an EventProvider');
    return context;
};

// ─── Helpers ─────────────────────────────────────────────────────────
function expandRecurring(events: AgendaEvent[], checkDate: string): AgendaEvent[] {
    const target = new Date(checkDate);
    const targetDay = target.getDay();
    return events.filter(e => {
        if (e.date === checkDate) return true;
        if (e.recurrence === 'weekly') {
            const eventDay = new Date(e.date).getDay();
            if (eventDay === targetDay) {
                return target >= new Date(e.date);
            }
        }
        return false;
    });
}

function toDateStr(d: Date): string {
    return d.toISOString().split('T')[0];
}

// ─── Provider ────────────────────────────────────────────────────────
export const EventProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { data: rawEvents, saveWith } = useCloudStorage<AgendaEvent[]>(
        'med-pilot-events',
        [],
    );

    // Valider les données au chargement
    const events: AgendaEvent[] = (() => {
        try { return validateEvents(rawEvents); } catch { return []; }
    })();

    const addEvent = useCallback((event: Omit<AgendaEvent, 'id'>) => {
        saveWith(prev => [...validateEvents(prev), { ...event, id: crypto.randomUUID() }]);
    }, [saveWith]);

    const removeEvent = useCallback((id: string) => {
        saveWith(prev => prev.filter(e => e.id !== id));
    }, [saveWith]);

    const updateEvent = useCallback((id: string, updates: Partial<Omit<AgendaEvent, 'id'>>) => {
        saveWith(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    }, [saveWith]);

    const getEventsForDate = useCallback((date: string): AgendaEvent[] => {
        return expandRecurring(events, date);
    }, [events]);

    const getEventsForWeek = useCallback((weekStart: Date): Map<string, AgendaEvent[]> => {
        const map = new Map<string, AgendaEvent[]>();
        for (let i = 0; i < 7; i++) {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + i);
            const key = toDateStr(d);
            map.set(key, expandRecurring(events, key));
        }
        return map;
    }, [events]);

    return (
        <EventContext.Provider value={{ events, addEvent, removeEvent, updateEvent, getEventsForDate, getEventsForWeek }}>
            {children}
        </EventContext.Provider>
    );
};
