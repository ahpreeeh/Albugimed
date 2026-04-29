"use client";

import React from "react";
import { Subject, getIconComponent } from "@/entities/subject/hooks";
import { CalendarClock } from "lucide-react";

interface SubjectCardProps {
    subject: Subject;
    onClick: () => void;
}

function computeStats(subject: Subject) {
    const total = subject.chapters.length;
    if (total === 0) return { total: 0, t1: 0, annales: 0, t2: 0, pctT1: 0, pctAnn: 0, pctT2: 0 };
    const t1 = subject.chapters.filter(c => c.status.t1).length;
    const annales = subject.chapters.filter(c => c.status.annales).length;
    const t2 = subject.chapters.filter(c => c.status.t2).length;
    return {
        total,
        t1, annales, t2,
        pctT1: Math.round((t1 / total) * 100),
        pctAnn: Math.round((annales / total) * 100),
        pctT2: Math.round((t2 / total) * 100),
    };
}

function daysUntilExam(examDate?: string): number | null {
    if (!examDate) return null;
    return Math.ceil((new Date(examDate).getTime() - Date.now()) / 86400000);
}

function getStatusColor(pctT1: number, pctAnn: number, pctT2: number): string {
    const avg = (pctT1 + pctAnn + pctT2) / 3;
    if (avg === 0) return "bg-[var(--color-text-muted)]";
    if (avg < 100) return "bg-amber-400";
    return "bg-emerald-400";
}

const MiniBar = ({ pct, label, color }: { pct: number; label: string; color: string }) => (
    <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wide">{label}</span>
            <span className="text-[10px] font-mono text-[var(--color-text-secondary)]">{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-[var(--color-bg-tertiary)] overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
        </div>
    </div>
);

export const SubjectCard = ({ subject, onClick }: SubjectCardProps) => {
    const stats = computeStats(subject);
    const days = daysUntilExam(subject.examDate);
    const Icon = getIconComponent(subject.iconName);
    const statusDot = getStatusColor(stats.pctT1, stats.pctAnn, stats.pctT2);

    return (
        <button
            onClick={onClick}
            className="app-card p-4 text-left w-full hover:border-[var(--color-accent)] transition-all duration-200 group cursor-pointer"
        >
            {/* Top row: icon + title + status */}
            <div className="flex items-start gap-3 mb-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent)] border border-[var(--color-accent-border)]">
                    <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                            {subject.title}
                        </h3>
                        <span className={`h-2 w-2 rounded-full shrink-0 ${statusDot}`} />
                    </div>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                        {stats.total} chapitre{stats.total !== 1 ? "s" : ""}
                    </p>
                </div>
            </div>

            {/* 3 progress bars */}
            {stats.total > 0 && (
                <div className="flex gap-3">
                    <MiniBar pct={stats.pctT1} label="Cours" color="bg-blue-400" />
                    <MiniBar pct={stats.pctAnn} label="Ann." color="bg-violet-400" />
                    <MiniBar pct={stats.pctT2} label="Rév." color="bg-emerald-400" />
                </div>
            )}

            {/* Exam badge */}
            {days !== null && days >= 0 && (
                <div className="mt-3 flex items-center gap-1.5 text-[10px] font-medium">
                    <CalendarClock className="h-3 w-3" />
                    <span className={days <= 7 ? "text-red-400" : days <= 14 ? "text-amber-400" : "text-[var(--color-text-muted)]"}>
                        J-{days}
                    </span>
                </div>
            )}
        </button>
    );
};
