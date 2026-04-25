"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    LayoutGrid, Clock, BookOpen, AlertCircle,
    ChevronRight, GraduationCap, Calendar,
    X,
} from "lucide-react";
import { useSubjects } from "@/entities/subject/hooks";
import type { Subject } from "@/entities/subject/hooks";
import { useEvents } from "@/context/EventContext";
import type { AgendaEvent } from "@/context/EventContext";

import { cn } from "@/shared/lib/cn";
import type { ActiveStrategy } from "@/entities/strategy/types";
import { SessionWidget } from "@/components/features/session/SessionWidget";
import { StatsBar } from "@/features/home-widgets/StatsBar";
import { EdnCountdown } from "@/features/home-widgets/EdnCountdown";
import { TasksNotes } from "@/features/home-widgets/TasksNotes";
import { RecentErrors } from "@/features/home-widgets/RecentErrors";

import { WeeklyTracker } from "@/components/features/tracking/WeeklyTracker";

// ——— Quick Actions ———
const QuickActions = () => {
    const router = useRouter();

    const actions = [
        { label: 'Lancer un DP', icon: GraduationCap, href: '/simulation' },
        { label: 'Agenda', icon: Calendar, href: '/planning' },
        { label: 'Matières', icon: BookOpen, href: '/subjects' },
    ];

    return (
        <div className="flex gap-2">
            {actions.map(a => (
                <button key={a.label} onClick={() => router.push(a.href)}
                    className="app-card flex-1 p-3 flex flex-col items-center gap-1.5 hover:border-[var(--color-accent)] transition-all cursor-pointer group">
                    <a.icon className="h-4 w-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] transition-colors" />
                    <span className="text-[10px] font-medium text-[var(--color-text-secondary)]">{a.label}</span>
                </button>
            ))}
        </div>
    );
};

// ——— Deadline helpers ———

interface DeadlineItem {
    dateStr: string;
    label: string;
    source: 'agenda' | 'strategy' | 'subject';
}

function isoDate(d: Date): string {
    // Local-timezone YYYY-MM-DD
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function daysDiff(dateStr: string, fromMidnight: Date): number {
    const to = new Date(`${dateStr}T00:00:00`);
    return Math.round((to.getTime() - fromMidnight.getTime()) / 86400000);
}

function relativeDateLabel(days: number): string {
    if (days === 0) return "Aujourd'hui";
    if (days === 1) return "Demain";
    return `Dans ${days} jours`;
}

function collectUpcoming(
    events: AgendaEvent[],
    subjects: Subject[],
    strategyDeadline: string | null,
    maxDays: number,
): DeadlineItem[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const items: DeadlineItem[] = [];

    // Strategy deadline
    if (strategyDeadline) {
        const diff = daysDiff(strategyDeadline, today);
        if (diff >= 0 && diff <= maxDays) {
            items.push({ dateStr: strategyDeadline, label: 'Échéance de stratégie', source: 'strategy' });
        }
    }

    // Subject exam dates only — chapter reviews are NOT deadlines
    for (const subject of subjects) {
        if (subject.examDate) {
            const diff = daysDiff(subject.examDate, today);
            if (diff >= 0 && diff <= maxDays) {
                items.push({ dateStr: subject.examDate, label: `Examen — ${subject.title}`, source: 'subject' });
            }
        }
    }

    // Agenda events (with recurring weekly expansion)
    for (let d = 0; d <= maxDays; d++) {
        const day = new Date(today);
        day.setDate(today.getDate() + d);
        const dayStr = isoDate(day);

        for (const event of events) {
            if (event.date === dayStr) {
                items.push({ dateStr: dayStr, label: event.title, source: 'agenda' });
            } else if (event.recurrence === 'weekly') {
                const eventDate = new Date(`${event.date}T00:00:00`);
                if (eventDate.getDay() === day.getDay() && day > eventDate) {
                    items.push({ dateStr: dayStr, label: event.title, source: 'agenda' });
                }
            }
        }
    }

    items.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
    return items;
}

function useUpcomingDeadlines(maxDays: number): DeadlineItem[] {
    const { events } = useEvents();
    const { subjects } = useSubjects();
    const [strategyDeadline, setStrategyDeadline] = useState<string | null>(null);

    useEffect(() => {
        try {
            const raw = localStorage.getItem('med-pilot-active-strategy');
            if (raw) {
                const parsed = JSON.parse(raw) as ActiveStrategy;
                setStrategyDeadline(parsed.preparationDeadline ?? null);
            }
        } catch { /* ignore */ }
    }, []);

    return useMemo(
        () => collectUpcoming(events, subjects, strategyDeadline, maxDays),
        [events, subjects, strategyDeadline, maxDays],
    );
}

// ——— Source dot color ———
function sourceDotClass(source: DeadlineItem['source']): string {
    if (source === 'agenda') return 'bg-[var(--color-accent)]';
    if (source === 'strategy') return 'bg-orange-400';
    return 'bg-purple-400'; // subject exam
}

// ——— Inline Alert Banner (48h) ———
const InlineAlertBanner = () => {
    const items = useUpcomingDeadlines(2);
    const [dismissed, setDismissed] = useState(false);

    // Re-show if items change (new deadline appears)
    useEffect(() => {
        if (items.length > 0) setDismissed(false);
    }, [items.length]);

    if (dismissed || items.length === 0) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Group by date for cleaner display
    const first = items[0];
    const firstDays = daysDiff(first.dateStr, today);
    const remaining = items.slice(1);

    return (
        <div
            className="rounded-xl border p-4 mb-5"
            style={{
                background: 'color-mix(in srgb, var(--color-priority-muted) 80%, white)',
                borderColor: 'var(--color-priority-border)',
            }}
        >
            <div className="flex items-start gap-3">
                <AlertCircle
                    className="h-4 w-4 mt-0.5 shrink-0"
                    style={{ color: 'var(--color-priority)' }}
                />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                        <h3
                            className="text-[13px] font-semibold truncate"
                            style={{ color: 'color-mix(in srgb, var(--color-priority) 80%, black)' }}
                        >
                            {first.label}
                        </h3>
                        <span
                            className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                            style={{
                                color: 'color-mix(in srgb, var(--color-priority) 80%, black)',
                                background: 'var(--color-priority-muted)',
                                borderColor: 'var(--color-priority-border)',
                            }}
                        >
                            {relativeDateLabel(firstDays)}
                        </span>
                    </div>

                    {remaining.length > 0 && (
                        <div className="mt-2 space-y-1">
                            {remaining.map((item, i) => {
                                const d = daysDiff(item.dateStr, today);
                                return (
                                    <p
                                        key={i}
                                        className="text-[11px]"
                                        style={{ color: 'color-mix(in srgb, var(--color-priority) 60%, black)' }}
                                    >
                                        <span className="font-medium">{relativeDateLabel(d)}</span>
                                        {' — '}{item.label}
                                    </p>
                                );
                            })}
                        </div>
                    )}
                </div>
                <button
                    onClick={() => setDismissed(true)}
                    className="shrink-0 transition-colors"
                    style={{ color: 'var(--color-priority)' }}
                    aria-label="Fermer"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    );
};

// ——— Upcoming Deadlines Widget ———
const UpcomingDeadlines = () => {
    const router = useRouter();
    const items = useUpcomingDeadlines(60);
    const top5 = items.slice(0, 5);

    if (top5.length === 0) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
        <div className="app-card p-3">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                    <span className="text-xs font-semibold text-[var(--color-text-primary)]">Prochaines échéances</span>
                </div>
                <button
                    onClick={() => router.push('/planning')}
                    className="text-[9px] text-[var(--color-accent)] hover:underline font-medium flex items-center gap-0.5"
                >
                    Agenda <ChevronRight className="h-2.5 w-2.5" />
                </button>
            </div>
            <div className="space-y-1.5">
                {top5.map((item, i) => {
                    const days = daysDiff(item.dateStr, today);
                    return (
                        <div key={i} className="flex items-start gap-2">
                            <div className={cn("h-1.5 w-1.5 rounded-full mt-1.5 shrink-0", sourceDotClass(item.source))} />
                            <div className="min-w-0">
                                <p className="text-[11px] text-[var(--color-text-primary)] truncate">{item.label}</p>
                                <p className="text-[9px] text-[var(--color-text-muted)]">{relativeDateLabel(days)}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ——— Main ———
export default function CockpitPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [timeData, setTimeData] = useState({ greeting: 'Bonjour', dateLabel: '' });

    useEffect(() => {
        setIsMounted(true);
        const h = new Date().getHours();
        let greeting = 'Bonjour';
        if (h >= 12 && h < 18) greeting = 'Bon après-midi';
        else if (h >= 18) greeting = 'Bonsoir';

        const dateLabel = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
        setTimeData({ greeting, dateLabel });
    }, []);

    if (!isMounted) {
        return (
            <div className="mx-auto max-w-[1560px]">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <span className="app-icon-box">
                            <LayoutGrid className="h-4 w-4" />
                        </span>
                        <div>
                            <h1 className="text-[28px] font-semibold leading-none text-[var(--color-text-primary)]">
                                Bonjour
                            </h1>
                            <p className="app-meta mt-1">&nbsp;</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-[1560px]">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <span className="app-icon-box">
                        <LayoutGrid className="h-4 w-4" />
                    </span>
                    <div>
                        <h1 className="text-[28px] font-semibold leading-none text-[var(--color-text-primary)]">
                            {timeData.greeting}
                        </h1>
                        <p className="app-meta mt-1 flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            {timeData.dateLabel}
                        </p>
                    </div>
                </div>
                <EdnCountdown />
            </div>

            {/* Stats */}
            <div className="mb-5">
                <StatsBar />
            </div>

            {/* Inline 48h alert banner */}
            <InlineAlertBanner />

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
                {/* Left: Session Widget & Tracking — self-start prevents stretching to match right column height */}
                <div className="self-start space-y-5">
                    <SessionWidget />
                    <WeeklyTracker />
                </div>

                {/* Right: widgets */}
                <div className="space-y-4">
                    <UpcomingDeadlines />
                    <TasksNotes />
                    <RecentErrors />
                    <QuickActions />
                </div>
            </div>
        </div>
    );
}
