"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { validateEvents } from '@/lib/validators';

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

// Expand weekly recurring events for a date range
function expandRecurring(events: AgendaEvent[], checkDate: string): AgendaEvent[] {
    const target = new Date(checkDate);
    const targetDay = target.getDay();

    return events.filter(e => {
        if (e.date === checkDate) return true;
        if (e.recurrence === 'weekly') {
            const eventDay = new Date(e.date).getDay();
            if (eventDay === targetDay) {
                const eventDate = new Date(e.date);
                return target >= eventDate; // only show from creation date forward
            }
        }
        return false;
    });
}

function toDateStr(d: Date): string {
    return d.toISOString().split('T')[0];
}

export const EventProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [events, setEvents] = useState<AgendaEvent[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('med-pilot-events');
        if (saved) {
            try {
                setEvents(validateEvents(JSON.parse(saved)));
            } catch (e) {
                console.error("Failed to parse events", e);
            }
        }
        setIsInitialized(true);
    }, []);

    useEffect(() => {
        if (!isInitialized) return;
        localStorage.setItem('med-pilot-events', JSON.stringify(events));
    }, [events, isInitialized]);

    const addEvent = (event: Omit<AgendaEvent, 'id'>) => {
        setEvents(prev => [...prev, { ...event, id: crypto.randomUUID() }]);
    };

    const removeEvent = (id: string) => {
        setEvents(prev => prev.filter(e => e.id !== id));
    };

    const updateEvent = (id: string, updates: Partial<Omit<AgendaEvent, 'id'>>) => {
        setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    };

    const getEventsForDate = (date: string): AgendaEvent[] => {
        return expandRecurring(events, date);
    };

    const getEventsForWeek = (weekStart: Date): Map<string, AgendaEvent[]> => {
        const map = new Map<string, AgendaEvent[]>();
        for (let i = 0; i < 7; i++) {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + i);
            const key = toDateStr(d);
            map.set(key, expandRecurring(events, key));
        }
        return map;
    };

    return (
        <EventContext.Provider value={{ events, addEvent, removeEvent, updateEvent, getEventsForDate, getEventsForWeek }}>
            {children}
        </EventContext.Provider>
    );
};
