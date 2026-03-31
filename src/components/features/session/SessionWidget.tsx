"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
    Play, Square, ArrowRight, SkipForward, Settings2,
    Clock, Zap, Target, CheckCircle2, Trophy,
} from 'lucide-react';
import { useStrategy } from '@/context/StrategyContext';
import { useSessionEngine } from '@/context/SessionEngineContext';
import { StrategyModal } from './StrategyModal';
import type { DayLoad } from '@/types/strategy';
import type { DifficultyRating } from '@/types/session';
import { reasonLabel, taskTypeLabel, reasonBadgeClass, difficultyColor } from '@/types/session';
import { cn } from '@/lib/utils';

// ─── Timer hook ──────────────────────────────────────────────────────
function useTimer(isRunning: boolean): number {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!isRunning) { setElapsed(0); return; }
        const start = Date.now();
        const interval = setInterval(() => setElapsed(Date.now() - start), 1000);
        return () => clearInterval(interval);
    }, [isRunning]);

    return elapsed;
}

function formatTime(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}m ${String(sec).padStart(2, '0')}s`;
}

// ─── Day Load Selector ───────────────────────────────────────────────
const DayLoadSelector = ({ onSelect }: { onSelect: (load: DayLoad) => void }) => {
    const loads: { value: DayLoad; label: string; sub: string; icon: React.ReactNode }[] = [
        { value: 'plancher', label: 'Plancher', sub: 'Léger', icon: <Target className="h-4 w-4" /> },
        { value: 'standard', label: 'Standard', sub: 'Équilibré', icon: <Zap className="h-4 w-4" /> },
        { value: 'plafond', label: 'Plafond', sub: 'Intensif', icon: <Trophy className="h-4 w-4" /> },
    ];

    return (
        <div className="space-y-3">
            <p className="text-[11px] font-medium text-[var(--color-text-secondary)]">
                Quelle journée souhaitez-vous ?
            </p>
            <div className="grid grid-cols-3 gap-2">
                {loads.map(l => (
                    <button key={l.value}
                        onClick={() => onSelect(l.value)}
                        className="app-card p-3 flex flex-col items-center gap-1.5 hover:border-[var(--color-accent)] transition-all cursor-pointer group">
                        <div className="text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] transition-colors">
                            {l.icon}
                        </div>
                        <span className="text-[12px] font-semibold text-[var(--color-text-primary)]">{l.label}</span>
                        <span className="text-[10px] text-[var(--color-text-muted)]">{l.sub}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

// ─── Difficulty Rating Selector ──────────────────────────────────────
const DifficultySelector = ({ onRate }: { onRate: (r: DifficultyRating) => void }) => {
    const ratings: { value: DifficultyRating; label: string }[] = [
        { value: 'blue', label: 'Facile' },
        { value: 'green', label: 'OK' },
        { value: 'orange', label: 'Difficile' },
        { value: 'red', label: 'Très dur' },
    ];

    return (
        <div className="space-y-2">
            <p className="text-[10px] font-medium text-[var(--color-text-muted)]">
                Comment avez-vous trouvé ?
            </p>
            <div className="flex gap-1.5">
                {ratings.map(r => (
                    <button key={r.value}
                        onClick={() => onRate(r.value)}
                        className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold text-white transition-all hover:scale-105"
                        style={{ backgroundColor: difficultyColor(r.value) }}>
                        {r.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

// ─── Main Widget ─────────────────────────────────────────────────────
export const SessionWidget = () => {
    const { hasStrategy } = useStrategy();
    const {
        session, generateSession,
        startCurrentTask, completeCurrentTask, skipCurrentTask,
        currentTask, currentTaskIndex, allDone, totalElapsedMs, hasSessionToday,
    } = useSessionEngine();

    const [strategieOpen, setStrategieOpen] = useState(false);
    const [showRating, setShowRating] = useState(false);

    const isRunning = currentTask?.status === 'in-progress';
    const liveTimer = useTimer(isRunning);

    // Progress bar
    const progress = useMemo(() => {
        if (!session || session.tasks.length === 0) return 0;
        const done = session.tasks.filter(t => t.status === 'done' || t.status === 'skipped').length;
        return Math.round((done / session.tasks.length) * 100);
    }, [session]);

    // ── No strategy configured ──
    if (!hasStrategy) {
        return (
            <>
                <div className="app-card p-5">
                    <div className="text-center space-y-3">
                        <div className="mx-auto h-10 w-10 rounded-xl bg-[var(--color-accent-muted)] flex items-center justify-center">
                            <Settings2 className="h-5 w-5 text-[var(--color-accent)]" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                                Programme du jour
                            </p>
                            <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                                Configurez votre stratégie pour recevoir des sessions personnalisées
                            </p>
                        </div>
                        <button
                            onClick={() => setStrategieOpen(true)}
                            className="app-btn app-btn-primary text-xs mx-auto">
                            <Settings2 className="h-3.5 w-3.5" />
                            Configurer la stratégie
                        </button>
                    </div>
                </div>
                <StrategyModal open={strategieOpen} onOpenChange={setStrategieOpen} />
            </>
        );
    }

    // ── Strategy set but no session generated today ──
    if (!hasSessionToday) {
        return (
            <>
                <div className="app-card p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold text-[var(--color-text-primary)]">Programme du jour</p>
                            <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                                Choisissez la charge de votre journée
                            </p>
                        </div>
                        <button onClick={() => setStrategieOpen(true)}
                            className="app-btn-ghost text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] p-1.5 rounded-lg transition-colors">
                            <Settings2 className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    <DayLoadSelector onSelect={(load) => generateSession(load)} />
                </div>
                <StrategyModal open={strategieOpen} onOpenChange={setStrategieOpen} />
            </>
        );
    }

    // ── Session in progress / completed ──
    return (
        <>
            <div className={cn(
                "app-card p-5 space-y-4 transition-all",
                isRunning && "border-[var(--color-accent-border)]"
            )}>
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-[var(--color-text-primary)]">Programme du jour</p>
                        <span className="app-badge-accent text-[9px]">
                            {session!.dayLoad === 'plancher' ? 'Léger' : session!.dayLoad === 'standard' ? 'Standard' : 'Intensif'}
                        </span>
                    </div>
                    <button onClick={() => setStrategieOpen(true)}
                        className="text-[var(--color-text-hint)] hover:text-[var(--color-text-primary)] p-1 rounded-lg transition-colors">
                        <Settings2 className="h-3.5 w-3.5" />
                    </button>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                    <div className="flex items-center justify-between text-[9px] text-[var(--color-text-muted)]">
                        <span>{currentTaskIndex + 1}/{session!.tasks.length} tâches</span>
                        <span className="flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            {formatTime(totalElapsedMs + (isRunning ? liveTimer : 0))}
                        </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--color-bar-track)] overflow-hidden">
                        <div className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-500"
                            style={{ width: `${progress}%` }} />
                    </div>
                </div>

                {/* All done state */}
                {allDone && (
                    <div className="text-center py-4 space-y-2">
                        <div className="mx-auto h-10 w-10 rounded-xl bg-[var(--color-success-muted)] flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5 text-[var(--color-success)]" />
                        </div>
                        <p className="text-sm font-semibold text-[var(--color-success)]">
                            Toutes les sessions sont terminées !
                        </p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">
                            Temps total : {formatTime(totalElapsedMs)}
                        </p>
                    </div>
                )}

                {/* Current task */}
                {currentTask && !allDone && (
                    <div className="space-y-3">
                        {/* Task info */}
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)] truncate flex-1">
                                    {currentTask.chapterTitle}
                                </h3>
                                <span className={cn("text-[9px]", reasonBadgeClass(currentTask.reason))}>
                                    {reasonLabel(currentTask.reason)}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-[var(--color-text-muted)]">
                                <span>{currentTask.subjectTitle}</span>
                                <span className="text-[var(--color-text-hint)]">•</span>
                                <span className="font-medium">
                                    {taskTypeLabel(currentTask.taskType, currentTask.annaleLevel)}
                                </span>
                                {isRunning && (
                                    <span className="flex items-center gap-1 text-[var(--color-accent)] font-mono">
                                        <Clock className="h-2.5 w-2.5 animate-pulse" />
                                        {formatTime(liveTimer)}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Difficulty rating (shown after clicking "Terminer") */}
                        {showRating ? (
                            <DifficultySelector onRate={(rating) => {
                                completeCurrentTask(rating);
                                setShowRating(false);
                            }} />
                        ) : (
                            /* Action buttons */
                            <div className="flex items-center gap-2">
                                {currentTask.status === 'pending' && (
                                    <button onClick={startCurrentTask}
                                        className="app-btn app-btn-primary text-xs flex-1">
                                        <Play className="h-3.5 w-3.5" />
                                        Commencer
                                    </button>
                                )}
                                {currentTask.status === 'in-progress' && (
                                    <button onClick={() => setShowRating(true)}
                                        className="app-btn app-btn-secondary text-xs flex-1">
                                        <Square className="h-3 w-3" />
                                        Terminer
                                    </button>
                                )}
                                {currentTask.status === 'pending' && (
                                    <button onClick={skipCurrentTask}
                                        className="app-btn-ghost p-2 rounded-lg text-[var(--color-text-hint)] hover:text-[var(--color-text-secondary)] transition-colors"
                                        title="Passer">
                                        <SkipForward className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Upcoming tasks preview */}
                        {session && currentTaskIndex < session.tasks.length - 1 && (
                            <div className="pt-2 border-t border-[var(--color-border)]">
                                <p className="text-[9px] text-[var(--color-text-hint)] mb-1.5 uppercase tracking-wider font-medium">
                                    À suivre
                                </p>
                                <div className="space-y-1">
                                    {session.tasks.slice(currentTaskIndex + 1, currentTaskIndex + 3).map(t => (
                                        <div key={t.id} className="flex items-center gap-2 text-[10px]">
                                            <div className="h-1 w-1 rounded-full bg-[var(--color-text-hint)]" />
                                            <span className="text-[var(--color-text-muted)] truncate">{t.chapterTitle}</span>
                                            <span className="text-[var(--color-text-hint)] shrink-0">
                                                {taskTypeLabel(t.taskType, t.annaleLevel)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <StrategyModal open={strategieOpen} onOpenChange={setStrategieOpen} />
        </>
    );
};
