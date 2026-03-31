"use client";

import React, { useState, useMemo } from "react";
import { BookOpen, Plus, Filter, ChevronDown, ChevronRight, FolderOpen } from "lucide-react";
import { useSubjects, Subject } from "@/context/SubjectContext";
import { SubjectCard } from "@/components/features/subjects/SubjectCard";
import { AddSubjectModal } from "@/components/features/subjects/AddSubjectModal";
import { SubjectDetailModal } from "@/components/features/subjects/SubjectDetailModal";
import { cn } from "@/lib/utils";

type FilterMode = "all" | "not-started" | "in-progress" | "exam-soon";

interface SemesterGroup {
    semester: string; // "" means no semester
    subjects: Subject[];
}

interface YearGroup {
    year: string;
    semesters: SemesterGroup[];
}

function groupSubjects(subjects: Subject[]): { years: YearGroup[]; unclassified: Subject[] } {
    const yearMap = new Map<string, Map<string, Subject[]>>();
    const unclassified: Subject[] = [];

    subjects.forEach(sub => {
        const y = sub.year?.trim();
        if (!y) { unclassified.push(sub); return; }
        const s = sub.semester?.trim() || "";
        if (!yearMap.has(y)) yearMap.set(y, new Map());
        const semMap = yearMap.get(y)!;
        if (!semMap.has(s)) semMap.set(s, []);
        semMap.get(s)!.push(sub);
    });

    const years: YearGroup[] = Array.from(yearMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([year, semMap]) => ({
            year,
            semesters: Array.from(semMap.entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([semester, subjects]) => ({ semester, subjects })),
        }));

    return { years, unclassified };
}

export const SubjectsView = () => {
    const { subjects } = useSubjects();
    const [showAdd, setShowAdd] = useState(false);
    const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterMode>("all");
    const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
    const [expandedSems, setExpandedSems] = useState<Set<string>>(new Set());

    const filtered = useMemo(() => {
        return subjects.filter(sub => {
            const totalFlags = sub.chapters.length * 3;
            const doneFlags = sub.chapters.reduce((acc, c) =>
                acc + (c.status.t1 ? 1 : 0) + (c.status.annales ? 1 : 0) + (c.status.t2 ? 1 : 0), 0);
            const pct = totalFlags > 0 ? doneFlags / totalFlags : 0;
            switch (filter) {
                case "not-started": return pct === 0;
                case "in-progress": return pct > 0 && pct < 1;
                case "exam-soon": {
                    if (!sub.examDate) return false;
                    const days = Math.ceil((new Date(sub.examDate).getTime() - Date.now()) / 86400000);
                    return days >= 0 && days <= 14;
                }
                default: return true;
            }
        });
    }, [subjects, filter]);

    const { years, unclassified } = useMemo(() => groupSubjects(filtered), [filtered]);

    const toggleYear = (y: string) => setExpandedYears(prev => {
        const next = new Set(prev);
        if (next.has(y)) next.delete(y); else next.add(y);
        return next;
    });
    const toggleSem = (key: string) => setExpandedSems(prev => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key); else next.add(key);
        return next;
    });

    const selectedSubject = subjects.find(s => s.id === selectedSubjectId) ?? null;

    const filters: { id: FilterMode; label: string }[] = [
        { id: "all", label: "Toutes" },
        { id: "not-started", label: "Pas commencé" },
        { id: "in-progress", label: "En cours" },
        { id: "exam-soon", label: "Examen proche" },
    ];

    return (
        <div className="mx-auto max-w-[1560px]">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <span className="app-icon-box">
                        <BookOpen className="h-4 w-4" />
                    </span>
                    <div>
                        <h1 className="text-[28px] font-semibold leading-none text-[var(--color-text-primary)]">
                            Matières
                        </h1>
                        <p className="app-meta mt-1">
                            {subjects.length} matière{subjects.length !== 1 ? "s" : ""} &middot;{" "}
                            {subjects.reduce((a, s) => a + s.chapters.length, 0)} chapitres
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowAdd(true)}
                    className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg border border-dashed border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-all"
                >
                    <Plus className="h-3.5 w-3.5" /> Ajouter
                </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 mb-5">
                <Filter className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
                {filters.map(f => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className={cn(
                            "text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all cursor-pointer",
                            filter === f.id
                                ? "border-[var(--color-accent)]/40 bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                                : "border-[var(--color-border-default)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]/30"
                        )}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Grid */}
            {filtered.length === 0 ? (
                <div className="app-card p-12 text-center">
                    <p className="text-[var(--color-text-secondary)] text-sm">
                        {subjects.length === 0
                            ? "Aucune matière. Commencez par en ajouter une."
                            : "Aucune matière ne correspond au filtre."}
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {/* ── Years ── */}
                    {years.map(yg => {
                        const yearCollapsed = !expandedYears.has(yg.year);
                        const totalInYear = yg.semesters.reduce((a, s) => a + s.subjects.length, 0);
                        return (
                            <div key={yg.year} className="rounded-xl border border-[var(--color-border-default)] overflow-hidden">
                                {/* Year header */}
                                <button
                                    onClick={() => toggleYear(yg.year)}
                                    className="w-full flex items-center gap-2.5 px-4 py-3 bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors cursor-pointer text-left"
                                >
                                    {yearCollapsed
                                        ? <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)] shrink-0" />
                                        : <ChevronDown className="h-4 w-4 text-[var(--color-text-muted)] shrink-0" />
                                    }
                                    <FolderOpen className="h-4 w-4 text-[var(--color-accent)] shrink-0" />
                                    <span className="text-sm font-bold text-[var(--color-text-primary)]">{yg.year}</span>
                                    <span className="text-[10px] font-mono text-[var(--color-text-hint)] ml-1">
                                        {totalInYear} matière{totalInYear > 1 ? "s" : ""}
                                    </span>
                                </button>

                                {/* Semesters */}
                                {!yearCollapsed && (
                                    <div className="divide-y divide-[var(--color-border-subtle)]">
                                        {yg.semesters.map(sg => {
                                            const semKey = `${yg.year}::${sg.semester}`;
                                            const semCollapsed = !expandedSems.has(semKey);
                                            return (
                                                <div key={semKey} className="bg-[var(--color-bg-primary)]">
                                                    {/* Semester header (only shown if semester label exists) */}
                                                    {sg.semester ? (
                                                        <button
                                                            onClick={() => toggleSem(semKey)}
                                                            className="w-full flex items-center gap-2 px-6 py-2.5 hover:bg-[var(--color-bg-secondary)] transition-colors cursor-pointer text-left"
                                                        >
                                                            {semCollapsed
                                                                ? <ChevronRight className="h-3.5 w-3.5 text-[var(--color-text-muted)] shrink-0" />
                                                                : <ChevronDown className="h-3.5 w-3.5 text-[var(--color-text-muted)] shrink-0" />
                                                            }
                                                            <span className="text-xs font-semibold text-[var(--color-text-secondary)]">{sg.semester}</span>
                                                            <span className="text-[10px] font-mono text-[var(--color-text-hint)]">
                                                                {sg.subjects.length}
                                                            </span>
                                                        </button>
                                                    ) : null}

                                                    {/* Subject cards */}
                                                    {(!sg.semester || !semCollapsed) && (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 pl-8">
                                                            {sg.subjects.map(sub => (
                                                                <SubjectCard
                                                                    key={sub.id}
                                                                    subject={sub}
                                                                    onClick={() => setSelectedSubjectId(sub.id)}
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Unclassified (no year set) */}
                    {unclassified.length > 0 && (
                        <div>
                            {years.length > 0 && (
                                <p className="text-[11px] text-[var(--color-text-hint)] font-medium mb-3 mt-4">
                                    Sans classification
                                </p>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {unclassified.map(sub => (
                                    <SubjectCard
                                        key={sub.id}
                                        subject={sub}
                                        onClick={() => setSelectedSubjectId(sub.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {showAdd && <AddSubjectModal onClose={() => setShowAdd(false)} />}
            {selectedSubject && (
                <SubjectDetailModal
                    subject={selectedSubject}
                    onClose={() => setSelectedSubjectId(null)}
                />
            )}
        </div>
    );
};
