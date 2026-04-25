"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    Play, Square, ArrowRight, SkipForward, Settings2,
    Clock, Zap, Target, CheckCircle2, Trophy, Pause, RotateCcw,
} from 'lucide-react';
import { useStrategy } from '@/entities/strategy/hooks';
import { useSubjects } from '@/entities/subject/hooks';
import {
    useAllDone,
    useCurrentTask,
    useDailySession,
    useHasSessionToday,
    useSessionActions,
    useTotalElapsed,
} from '@/entities/session/hooks';
import { StrategyModal } from './StrategyModal';
import { useSessionTimingStorage } from '@/hooks/useSessionTimingStorage';
import type { DayLoad } from '@/entities/strategy/types';
import type { DifficultyRating } from '@/entities/session/types';
import { reasonLabel, taskTypeLabel, reasonBadgeClass, difficultyColor } from '@/entities/session/types';
import { cn } from '@/shared/lib/cn';
import { toLocalISOString } from '@/shared/lib/dates';

// ─── Timer hook (with pause support) ─────────────────────────────────
//
// Le temps écoulé est dérivé du timestamp `startedAt` de la tâche en
// cours, qui est persisté (cloud + localStorage). Quand le widget se
// démonte/remonte (par exemple après une navigation entre routes),
// l'horloge ne repart PAS à zéro : elle reprend à `Date.now() - startedAt`.
//
// La pause reste un état local au widget (non persisté entre nav).
// Si l'utilisateur met en pause puis change de route, à son retour
// le timer apparaîtra "running" (pas plus paused) — le compromis de
// simplicité ; persister l'état de pause demanderait de l'ajouter au
// modèle de tâche.
function useTimer(startedAt: number | null, isPaused: boolean): number {
    const [now, setNow] = useState(() => Date.now());
    const pauseAccumRef = useRef(0);
    const pauseStartRef = useRef<number | null>(null);
    const frozenElapsedRef = useRef<number | null>(null);
    const lastStartedAtRef = useRef<number | null>(null);

    // Reset des accumulateurs quand la tâche change (différent startedAt)
    useEffect(() => {
        if (lastStartedAtRef.current !== startedAt) {
            pauseAccumRef.current = 0;
            pauseStartRef.current = null;
            frozenElapsedRef.current = null;
            lastStartedAtRef.current = startedAt;
        }
    }, [startedAt]);

    // Tracking des transitions pause/resume
    useEffect(() => {
        if (!startedAt) return;
        if (isPaused) {
            frozenElapsedRef.current = Date.now() - startedAt - pauseAccumRef.current;
            pauseStartRef.current = Date.now();
        } else if (pauseStartRef.current !== null) {
            pauseAccumRef.current += Date.now() - pauseStartRef.current;
            pauseStartRef.current = null;
            frozenElapsedRef.current = null;
            setNow(Date.now()); // refresh immédiat à la reprise
        }
    }, [isPaused, startedAt]);

    // Tick toutes les secondes quand la tâche tourne
    useEffect(() => {
        if (!startedAt || isPaused) return;
        setNow(Date.now()); // refresh immédiat au montage / start
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, [startedAt, isPaused]);

    if (!startedAt) return 0;
    if (isPaused && frozenElapsedRef.current !== null) {
        return frozenElapsedRef.current;
    }
    return Math.max(0, now - startedAt - pauseAccumRef.current);
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
    const { hasStrategy, strategy } = useStrategy();
    const { subjects, updateChapterProgress } = useSubjects();
    const session = useDailySession();
    const { currentTask, currentTaskIndex } = useCurrentTask();
    const allDone = useAllDone();
    const totalElapsedMs = useTotalElapsed();
    const today = toLocalISOString(new Date());
    const hasSessionToday = useHasSessionToday(today);
    const {
        hydrate,
        generateSession: generateStoreSession,
        startTask,
        completeTask,
        skipTask,
        clearSession,
    } = useSessionActions();

    const [strategieOpen, setStrategieOpen] = useState(false);
    const [showRating, setShowRating] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const startedAtRef = useRef<string | null>(null);
    const pendingDurationRef = useRef(0);

    const isRunning = currentTask?.status === 'in-progress';
    // Timer dérive du startedAt persisté → survit aux navigations entre routes
    // (cf. useTimer) au lieu de repartir à zéro à chaque remount du widget.
    const liveTimer = useTimer(
        isRunning ? currentTask?.startedAt ?? null : null,
        isPaused,
    );

    // Hydratation : appelle le store qui filtre lui-même par date.
    // Pas de reset préalable : le store est un singleton qui doit conserver
    // son état à travers les navigations entre routes (Phase 4 Lot V).
    // Si la date a changé (passage minuit), `hydrate(today)` se chargera
    // de jeter la session de la veille via son filtre interne.
    useEffect(() => {
        void hydrate(today);
    }, [hydrate, today]);

    // Reset pause when task changes
    useEffect(() => { setIsPaused(false); }, [currentTask?.id]);

    const { saveWith: saveTimingEntries } = useSessionTimingStorage();

    const generateSession = useCallback((load: DayLoad) => {
        if (!strategy) return;
        generateStoreSession(strategy, subjects, load, today);
    }, [generateStoreSession, strategy, subjects, today]);

    const handleStart = useCallback(() => {
        startedAtRef.current = new Date().toISOString();
        if (!currentTask) return;
        startTask(currentTask.id);
    }, [currentTask, startTask]);

    const handleStop = useCallback(() => {
        pendingDurationRef.current = liveTimer;
        setShowRating(true);
    }, [liveTimer]);

    const saveTimingEntry = useCallback((durationMs: number) => {
        if (!currentTask || !startedAtRef.current) return;
        const completedAt = new Date().toISOString();
        const entry = {
            taskId: currentTask.id,
            subjectId: currentTask.subjectId,
            chapterId: currentTask.chapterId,
            chapterTitle: currentTask.chapterTitle,
            subjectTitle: currentTask.subjectTitle,
            taskType: currentTask.taskType,
            annaleLevel: currentTask.annaleLevel,
            reason: currentTask.reason,
            startedAt: startedAtRef.current,
            completedAt,
            durationMs,
            date: toLocalISOString(new Date(completedAt)),
        };
        saveTimingEntries(prev => [...prev, entry]);
        startedAtRef.current = null;
    }, [currentTask, saveTimingEntries]);

    const completeCurrentTask = useCallback((rating: DifficultyRating) => {
        if (!currentTask) return;

        const completion = completeTask(currentTask.id, rating);
        if (!completion) return;

        updateChapterProgress(
            completion.subjectId,
            completion.chapterId,
            completion.progressUpdate,
        );
    }, [completeTask, currentTask, updateChapterProgress]);

    const skipCurrentTask = useCallback(() => {
        if (!currentTask) return;
        skipTask(currentTask.id);
    }, [currentTask, skipTask]);

    const handleResetTodaySession = useCallback(() => {
        const confirmed = window.confirm(
            "Réinitialiser uniquement la session du jour ? L'historique, les matières, la stratégie et le timing resteront inchangés.",
        );
        if (!confirmed) return;
        clearSession();
    }, [clearSession]);

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
                    <div className="flex items-center gap-1">
                        <button onClick={handleResetTodaySession}
                            className="text-[var(--color-text-hint)] hover:text-[var(--color-text-primary)] p-1 rounded-lg transition-colors"
                            title="Régénérer la session du jour">
                            <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setStrategieOpen(true)}
                            className="text-[var(--color-text-hint)] hover:text-[var(--color-text-primary)] p-1 rounded-lg transition-colors"
                            title="Configurer la stratégie">
                            <Settings2 className="h-3.5 w-3.5" />
                        </button>
                    </div>
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
                        <button
                            onClick={handleResetTodaySession}
                            className="app-btn-ghost mx-auto text-[11px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                        >
                            Réinitialiser la session du jour
                        </button>
                    </div>
                )}

                {/* Current task */}
                {currentTask && !allDone && (
                    <div className="space-y-4">
                        {/* Task info & Actions — vertical on mobile, horizontal on sm+ */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                            <div className="space-y-2 flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                                        {currentTask.subjectTitle} - {currentTask.chapterTitle}
                                    </h3>
                                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold", reasonBadgeClass(currentTask.reason))}>
                                        {reasonLabel(currentTask.reason)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-[12px] text-[var(--color-text-muted)] flex-wrap">
                                    <span className="flex items-center gap-1.5">
                                        <Clock className="h-3.5 w-3.5" />
                                        45 min
                                    </span>
                                    <span className="px-2.5 py-1 rounded-full bg-[var(--color-bg-tertiary)] font-medium text-[var(--color-text-secondary)]">
                                        {taskTypeLabel(currentTask.taskType, currentTask.annaleLevel)}
                                    </span>
                                    {isRunning && (
                                        <span className="flex items-center gap-1.5 text-[var(--color-accent)] font-mono">
                                            <Clock className="h-3.5 w-3.5 animate-pulse" />
                                            {formatTime(liveTimer)}
                                            {isPaused && <span className="text-amber-500 text-[10px] ml-1 uppercase font-bold tracking-wider">(En pause)</span>}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="shrink-0 flex items-center">
                                {showRating ? (
                                    <DifficultySelector onRate={(rating) => {
                                        completeCurrentTask(rating);
                                        saveTimingEntry(pendingDurationRef.current);
                                        setShowRating(false);
                                    }} />
                                ) : (
                                    <div className="flex items-center gap-2">
                                        {currentTask.status === 'pending' && (
                                            <>
                                                <button onClick={handleStart}
                                                    className="bg-[var(--color-accent)] hover:opacity-90 text-white px-5 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 transition-all shadow-sm">
                                                    <Play className="h-4 w-4" />
                                                    Commencer
                                                </button>
                                                <button onClick={skipCurrentTask}
                                                    className="p-2.5 rounded-xl text-[var(--color-text-hint)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
                                                    title="Passer au suivant">
                                                    <SkipForward className="h-4 w-4" />
                                                </button>
                                            </>
                                        )}
                                        {currentTask.status === 'in-progress' && (
                                            <>
                                                <button onClick={() => setIsPaused(!isPaused)}
                                                    className={cn(
                                                        "p-2.5 rounded-xl transition-all shadow-sm",
                                                        isPaused ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "bg-white border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]"
                                                    )}
                                                    title={isPaused ? "Reprendre" : "Mettre en pause"}>
                                                    {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                                                </button>
                                                <button onClick={handleStop}
                                                    className="bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 transition-all shadow-sm">
                                                    <Square className="h-3 w-3" />
                                                    Terminer
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

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
