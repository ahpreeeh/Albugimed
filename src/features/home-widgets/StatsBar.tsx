"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Zap } from "lucide-react";
import { useSubjects } from "@/entities/subject/hooks";

export const StatsBar = () => {
    const { subjects } = useSubjects();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => { setIsMounted(true); }, []);

    const stats = useMemo(() => {
        if (!isMounted) return { totalCh: 0, doneCh: 0, totalFlags: 0, doneFlags: 0, subjects: 0 };
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
    }, [subjects, isMounted]);

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
