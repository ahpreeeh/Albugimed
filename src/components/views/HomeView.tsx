"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
    LayoutGrid, Clock, BookOpen, AlertCircle,
    ChevronRight, Zap, GraduationCap, Calendar,
    Target, Plus, CheckSquare, FileText, Trash2, X,
} from "lucide-react";
import { useSubjects } from "@/context/SubjectContext";
import type { Subject } from "@/context/SubjectContext";
import { useEvents } from "@/context/EventContext";
import type { AgendaEvent } from "@/context/EventContext";
import { useView } from "@/context/ViewContext";

import { cn } from "@/lib/utils";
import type { ErrorEntry } from "@/types";
import type { ActiveStrategy } from "@/types/strategy";
import { SessionWidget } from "@/components/features/session/SessionWidget";

import { WeeklyTracker } from "@/components/features/tracking/WeeklyTracker";

// ——— EDN Countdown ———
const EDN_DATE_KEY = 'med-pilot-edn-date';

const EdnCountdown = () => {
    const [ednDate, setEdnDate] = useState('');
    const [editing, setEditing] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem(EDN_DATE_KEY);
        if (stored) setEdnDate(stored);
    }, []);

    const save = (val: string) => {
        setEdnDate(val);
        localStorage.setItem(EDN_DATE_KEY, val);
        setEditing(false);
    };

    if (!ednDate && !editing) {
        return (
            <button onClick={() => setEditing(true)}
                className="text-[10px] text-[var(--color-accent)] hover:underline font-medium">
                + Configurer date EDN
            </button>
        );
    }

    if (editing) {
        return (
            <input type="date" value={ednDate} onChange={e => save(e.target.value)}
                onBlur={() => setEditing(false)} autoFocus
                className="app-input text-xs py-0.5 px-2" />
        );
    }

    const days = Math.ceil((new Date(ednDate).getTime() - Date.now()) / 86400000);
    if (days < 0) return null;

    return (
        <button onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--color-accent)] hover:underline cursor-pointer">
            <Target className="h-3 w-3" />
            J-{days} EDN
        </button>
    );
};

// ——— Stats Bar ———
const StatsBar = () => {
    const { subjects } = useSubjects();

    const stats = useMemo(() => {
        let totalCh = 0, doneCh = 0, totalFlags = 0, doneFlags = 0;
        subjects.forEach(s => {
            s.chapters.forEach(c => {
                totalCh++;
                const flagsDone = (c.status.t1 ? 1 : 0) + (c.status.annales ? 1 : 0) + (c.status.t2 ? 1 : 0);
                doneFlags += flagsDone;
                totalFlags += 3;
                if (flagsDone === 3) doneCh++;
            });
        });
        return { totalCh, doneCh, totalFlags, doneFlags, subjects: subjects.length };
    }, [subjects]);

    const pct = stats.totalFlags > 0 ? Math.round((stats.doneFlags / stats.totalFlags) * 100) : 0;

    return (
        <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
                <BookOpen className="h-3 w-3 text-[var(--color-text-muted)]" />
                <span className="text-[11px] text-[var(--color-text-secondary)]">
                    <span className="font-semibold text-[var(--color-text-primary)]">{stats.subjects}</span> matières
                </span>
            </div>
            <div className="flex items-center gap-1.5">
                <Zap className="h-3 w-3 text-[var(--color-text-muted)]" />
                <span className="text-[11px] text-[var(--color-text-secondary)]">
                    <span className="font-semibold text-[var(--color-text-primary)]">{stats.doneCh}</span>/{stats.totalCh} complets
                </span>
            </div>
            <div className="flex items-center gap-1.5">
                <div className="w-16 h-1.5 rounded-full bg-[var(--color-bg-tertiary)] overflow-hidden">
                    <div className="h-full rounded-full bg-[var(--color-accent)] transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[10px] font-mono text-[var(--color-text-muted)]">{pct}%</span>
            </div>
        </div>
    );
};


// ——— Recent Errors ———
const RecentErrors = () => {
    const { setActiveView } = useView();
    const [errors, setErrors] = useState<ErrorEntry[]>([]);

    useEffect(() => {
        try {
            const raw = JSON.parse(localStorage.getItem('med-pilot-error-bank') || '[]');
            setErrors(Array.isArray(raw) ? raw.slice(0, 5) : []);
        } catch { setErrors([]); }
    }, []);

    if (errors.length === 0) return null;

    return (
        <div className="app-card p-3">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                    <span className="text-xs font-semibold text-[var(--color-text-primary)]">Dernières erreurs</span>
                </div>
                <button onClick={() => setActiveView('simulation')}
                    className="text-[9px] text-[var(--color-accent)] hover:underline font-medium flex items-center gap-0.5">
                    Voir tout <ChevronRight className="h-2.5 w-2.5" />
                </button>
            </div>
            <div className="space-y-1.5">
                {errors.map(err => (
                    <div key={err.id} className="flex items-start gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                        <div className="min-w-0">
                            <p className="text-[11px] font-medium text-[var(--color-text-primary)] truncate">{err.question}</p>
                            <p className="text-[9px] text-[var(--color-text-muted)]">{err.matiere}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ——— Tasks & Notes ———
const TASKS_KEY = 'med-pilot-quick-tasks';
const NOTES_KEY = 'med-pilot-quick-notes';

interface QuickTask { id: string; text: string; done: boolean; }

const TasksNotes = () => {
    const [tab, setTab] = useState<'tasks' | 'notes'>('tasks');
    const [tasks, setTasks] = useState<QuickTask[]>([]);
    const [input, setInput] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        try { setTasks(JSON.parse(localStorage.getItem(TASKS_KEY) || '[]')); } catch { setTasks([]); }
        setNotes(localStorage.getItem(NOTES_KEY) || '');
    }, []);

    const saveTasks = (t: QuickTask[]) => { setTasks(t); localStorage.setItem(TASKS_KEY, JSON.stringify(t)); };
    const saveNotes = (n: string) => { setNotes(n); localStorage.setItem(NOTES_KEY, n); };

    const addTask = () => {
        if (!input.trim()) return;
        saveTasks([...tasks, { id: Date.now().toString(), text: input.trim(), done: false }]);
        setInput('');
    };

    const toggleTask = (id: string) => saveTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
    const deleteTask = (id: string) => saveTasks(tasks.filter(t => t.id !== id));

    const pendingCount = tasks.filter(t => !t.done).length;

    return (
        <div className="app-card p-3">
            {/* Tabs */}
            <div className="flex items-center gap-1 mb-3">
                <button onClick={() => setTab('tasks')}
                    className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all",
                        tab === 'tasks'
                            ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                            : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                    )}>
                    <CheckSquare className="h-3 w-3" />
                    Tâches{pendingCount > 0 && <span className="text-[9px] opacity-70">({pendingCount})</span>}
                </button>
                <button onClick={() => setTab('notes')}
                    className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all",
                        tab === 'notes'
                            ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                            : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                    )}>
                    <FileText className="h-3 w-3" />
                    Notes
                </button>
            </div>

            {tab === 'tasks' ? (
                <div>
                    {/* Input */}
                    <div className="flex gap-1.5 mb-2">
                        <input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addTask()}
                            placeholder="Ajouter une tâche..."
                            className="app-input flex-1 text-[11px] py-1 px-2"
                        />
                        <button onClick={addTask}
                            className="h-7 w-7 flex items-center justify-center rounded-lg border border-dashed border-[var(--color-border-default)] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-all">
                            <Plus className="h-3 w-3" />
                        </button>
                    </div>
                    {/* List */}
                    <div className="space-y-1 max-h-[180px] overflow-y-auto">
                        {tasks.length === 0 && (
                            <p className="text-[10px] text-[var(--color-text-hint)] text-center py-2">Aucune tâche</p>
                        )}
                        {tasks.map(t => (
                            <div key={t.id} className="flex items-center gap-2 group">
                                <button onClick={() => toggleTask(t.id)}
                                    className={cn(
                                        "h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 transition-all",
                                        t.done
                                            ? "bg-[var(--color-accent)] border-[var(--color-accent)]"
                                            : "border-[var(--color-border-default)] hover:border-[var(--color-accent)]"
                                    )}>
                                    {t.done && <svg viewBox="0 0 12 12" className="h-2 w-2 text-white"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" fill="none" /></svg>}
                                </button>
                                <span className={cn(
                                    "text-[11px] flex-1 min-w-0 truncate",
                                    t.done ? "line-through text-[var(--color-text-hint)]" : "text-[var(--color-text-primary)]"
                                )}>{t.text}</span>
                                <button onClick={() => deleteTask(t.id)}
                                    className="opacity-0 group-hover:opacity-100 text-[var(--color-text-hint)] hover:text-red-400 transition-all">
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <textarea
                    value={notes}
                    onChange={e => saveNotes(e.target.value)}
                    placeholder="Notes libres..."
                    className="app-input w-full text-[11px] resize-none h-[180px] p-2 font-mono"
                />
            )}
        </div>
    );
};

// ——— Quick Actions ———
const QuickActions = () => {
    const { setActiveView } = useView();

    const actions = [
        { label: 'Lancer un DP', icon: GraduationCap, view: 'simulation' as const },
        { label: 'Agenda', icon: Calendar, view: 'planning' as const },
        { label: 'Matières', icon: BookOpen, view: 'subjects' as const },
    ];

    return (
        <div className="flex gap-2">
            {actions.map(a => (
                <button key={a.label} onClick={() => setActiveView(a.view)}
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
    const { setActiveView } = useView();
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
                    onClick={() => setActiveView('planning')}
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
export const HomeView = () => {
    const greeting = useMemo(() => {
        const h = new Date().getHours();
        if (h < 12) return 'Bonjour';
        if (h < 18) return 'Bon après-midi';
        return 'Bonsoir';
    }, []);

    const dateLabel = useMemo(() =>
        new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()),
    []);

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
                            {greeting}
                        </h1>
                        <p className="app-meta mt-1 flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            {dateLabel}
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
};
