"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { BookOpen, LucideIcon } from 'lucide-react';
import { validateSubjects } from '@/shared/lib/validators';
import { MEDICAL_ICON_MAP, MEDICAL_ICON_NAMES } from '@/components/icons/MedicalIcons';
import type { MedIconProps } from '@/components/icons/MedicalIcons';
import { createClient } from '@/utils/supabase/client';
import type { ChapterStatus, ChapterProgress, Chapter, Subject } from '@/entities/subject/types';
import { createDefaultProgress } from '@/entities/subject/model';

// ─── Icon map ─────────────────────────────────────────────────────────
export const ICON_MAP: Record<string, LucideIcon | React.FC<MedIconProps>> = {
    ...MEDICAL_ICON_MAP,
    BookOpen,
};

// ─── Types (ré-export pour BC jusqu'à step 2.6) ──────────────────────
export type { ChapterStatus, ChapterProgress, Chapter, Subject };

interface SubjectContextType {
    subjects: Subject[];
    addSubject: (title: string, iconName: string, chapters: string[], options?: { examDate?: string; year?: string; semester?: string }) => void;
    updateSubject: (id: string, updates: Partial<Pick<Subject, 'title' | 'iconName' | 'examDate' | 'year' | 'semester'>>) => void;
    deleteSubject: (id: string) => void;
    addChapter: (subjectId: string, title: string) => void;
    addChaptersBulk: (subjectId: string, titles: string[]) => void;
    editChapterTitle: (subjectId: string, chapterId: string, newTitle: string) => void;
    deleteChapter: (subjectId: string, chapterId: string) => void;
    toggleChapterStatus: (subjectId: string, chapterId: string, type: keyof ChapterStatus) => void;
    updateChapterProgress: (subjectId: string, chapterId: string, updates: Partial<ChapterProgress>) => void;
}

const SubjectContext = createContext<SubjectContextType | undefined>(undefined);

const STORAGE_KEY = 'med-pilot-subjects-v4';

// ─── Provider ─────────────────────────────────────────────────────────
export const SubjectProvider = ({ children }: { children: ReactNode }) => {
    // Init depuis localStorage immédiatement (UI instantanée)
    const [subjects, setSubjects] = useState<Subject[]>(() => {
        if (typeof window === 'undefined') return [];
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? validateSubjects(JSON.parse(raw)) : [];
        } catch { return []; }
    });

    const supabase = useRef(createClient()).current;
    const isCloudLoaded = useRef(false);

    // ── Chargement depuis Supabase au montage ────────────────────────
    useEffect(() => {
        let cancelled = false;

        async function loadFromCloud() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: row } = await supabase
                    .from('user_data')
                    .select('data_value')
                    .eq('user_id', user.id)
                    .eq('data_key', STORAGE_KEY)
                    .maybeSingle();

                if (!cancelled && row?.data_value) {
                    const cloudSubjects = validateSubjects(row.data_value as Subject[]);
                    setSubjects(cloudSubjects);
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudSubjects));
                }
            } catch (err) {
                console.warn('[SubjectContext] Chargement Supabase échoué', err);
            } finally {
                if (!cancelled) isCloudLoaded.current = true;
            }
        }

        loadFromCloud();
        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Persistance : localStorage + Supabase (fire-and-forget) ─────
    const persist = useCallback((next: Subject[]) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) return;
            supabase.from('user_data').upsert(
                { user_id: user.id, data_key: STORAGE_KEY, data_value: next },
                { onConflict: 'user_id,data_key' },
            ).then(({ error }) => {
                if (error) {
                    console.error('[SubjectContext] Erreur lors de la synchronisation Supabase:', error);
                } else {
                    console.log('[SubjectContext] Synchronisation réussie.');
                }
            });
        });
    }, [supabase]);

    // ── Mutation helper : setSubjects + persist ──────────────────────
    const mutate = useCallback((updater: (prev: Subject[]) => Subject[]) => {
        setSubjects(prev => {
            const next = updater(prev);
            persist(next);
            return next;
        });
    }, [persist]);

    // ── CRUD Subjects ─────────────────────────────────────────────────
    const addSubject = useCallback((
        title: string,
        iconName: string,
        chapterTitles: string[],
        options?: { examDate?: string; year?: string; semester?: string },
    ) => {
        const newSubject: Subject = {
            id: crypto.randomUUID(),
            title,
            iconName,
            chapters: chapterTitles
                .map(t => t.trim())
                .filter(t => t !== '')
                .map(t => ({
                    id: crypto.randomUUID(),
                    title: t,
                    status: { t1: false, annales: false, t2: false },
                    progress: createDefaultProgress(),
                })),
            ...(options?.examDate && { examDate: options.examDate }),
            ...(options?.year && { year: options.year }),
            ...(options?.semester && { semester: options.semester }),
        };
        mutate(prev => [...prev, newSubject]);
    }, [mutate]);

    const updateSubject = useCallback((
        id: string,
        updates: Partial<Pick<Subject, 'title' | 'iconName' | 'examDate' | 'year' | 'semester'>>,
    ) => {
        mutate(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    }, [mutate]);

    const deleteSubject = useCallback((id: string) => {
        mutate(prev => prev.filter(s => s.id !== id));
    }, [mutate]);

    // ── CRUD Chapters ─────────────────────────────────────────────────
    const addChapter = useCallback((subjectId: string, title: string) => {
        mutate(prev => prev.map(sub => {
            if (sub.id !== subjectId) return sub;
            return {
                ...sub,
                chapters: [...sub.chapters, {
                    id: crypto.randomUUID(),
                    title: title.trim(),
                    status: { t1: false, annales: false, t2: false },
                    progress: createDefaultProgress(),
                }],
            };
        }));
    }, [mutate]);

    const addChaptersBulk = useCallback((subjectId: string, titles: string[]) => {
        mutate(prev => prev.map(sub => {
            if (sub.id !== subjectId) return sub;
            const newChapters = titles
                .map(t => t.trim())
                .filter(t => t !== '')
                .map(t => ({
                    id: crypto.randomUUID(),
                    title: t,
                    status: { t1: false, annales: false, t2: false } as ChapterStatus,
                    progress: createDefaultProgress(),
                }));
            return { ...sub, chapters: [...sub.chapters, ...newChapters] };
        }));
    }, [mutate]);

    const editChapterTitle = useCallback((subjectId: string, chapterId: string, newTitle: string) => {
        mutate(prev => prev.map(sub => {
            if (sub.id !== subjectId) return sub;
            return {
                ...sub,
                chapters: sub.chapters.map(c =>
                    c.id === chapterId ? { ...c, title: newTitle } : c
                ),
            };
        }));
    }, [mutate]);

    const deleteChapter = useCallback((subjectId: string, chapterId: string) => {
        mutate(prev => prev.map(sub => {
            if (sub.id !== subjectId) return sub;
            return { ...sub, chapters: sub.chapters.filter(c => c.id !== chapterId) };
        }));
    }, [mutate]);

    const toggleChapterStatus = useCallback((
        subjectId: string,
        chapterId: string,
        type: keyof ChapterStatus,
    ) => {
        mutate(prev => prev.map(sub => {
            if (sub.id !== subjectId) return sub;
            return {
                ...sub,
                chapters: sub.chapters.map(c => {
                    if (c.id !== chapterId) return c;
                    return { ...c, status: { ...c.status, [type]: !c.status[type] } };
                }),
            };
        }));
    }, [mutate]);

    const updateChapterProgress = useCallback((
        subjectId: string,
        chapterId: string,
        updates: Partial<ChapterProgress>,
    ) => {
        mutate(prev => prev.map(sub => {
            if (sub.id !== subjectId) return sub;
            return {
                ...sub,
                chapters: sub.chapters.map(c =>
                    c.id === chapterId ? { ...c, progress: { ...c.progress, ...updates } } : c
                ),
            };
        }));
    }, [mutate]);

    return (
        <SubjectContext.Provider value={{
            subjects, addSubject, updateSubject, deleteSubject,
            addChapter, addChaptersBulk, editChapterTitle, deleteChapter,
            toggleChapterStatus, updateChapterProgress,
        }}>
            {children}
        </SubjectContext.Provider>
    );
};

// ─── Hooks / exports ──────────────────────────────────────────────────
export const useSubjects = () => {
    const context = useContext(SubjectContext);
    if (context === undefined) throw new Error('useSubjects must be used within a SubjectProvider');
    return context;
};

export const getIconComponent = (iconName: string) => ICON_MAP[iconName] || BookOpen;
export const AVAILABLE_ICONS = [...MEDICAL_ICON_NAMES];
