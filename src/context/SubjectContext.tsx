"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BookOpen, LucideIcon } from 'lucide-react';
import { validateSubjects } from '@/lib/validators';
import { MEDICAL_ICON_MAP, MEDICAL_ICON_NAMES } from '@/components/icons/MedicalIcons';
import type { MedIconProps } from '@/components/icons/MedicalIcons';
import { createClient } from '@/utils/supabase/client';

// Unified icon map: medical custom icons + BookOpen fallback
export const ICON_MAP: Record<string, LucideIcon | React.FC<MedIconProps>> = {
    ...MEDICAL_ICON_MAP,
    BookOpen,
};

export interface ChapterStatus {
    t1: boolean;
    annales: boolean;
    t2: boolean;
}

export interface ChapterProgress {
    courseStarted: boolean;
    level1Done: boolean;
    reactivationDone: boolean;
    advancedDone: boolean;
    firstSeenDate: string | null;
    lastWorkedDate: string | null;
    lastTrainingDate: string | null;
    lastReviewDifficulty?: 'red' | 'orange' | 'green' | 'blue';
    nextReviewDate?: string | null;
}

export interface Chapter {
    id: string;
    title: string;
    status: ChapterStatus;
    progress: ChapterProgress;
}

export interface Subject {
    id: string;
    title: string;
    iconName: string;
    chapters: Chapter[];
    examDate?: string;
    year?: string;      // e.g. "Med3", "Med4", "Med5"
    semester?: string;   // e.g. "S1", "S2"
}

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

function createDefaultProgress(): ChapterProgress {
    return {
        courseStarted: false,
        level1Done: false,
        reactivationDone: false,
        advancedDone: false,
        firstSeenDate: null,
        lastWorkedDate: null,
        lastTrainingDate: null,
        lastReviewDifficulty: undefined,
        nextReviewDate: null,
    };
}

export const SubjectProvider = ({ children }: { children: ReactNode }) => {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    
    // Client navigateur Supabase pour interagir avec user_progress
    const supabase = createClient();

    useEffect(() => {
        const loadData = async () => {
            let localSubjects: Subject[] = [];
            const saved = localStorage.getItem(STORAGE_KEY);
            
            // 1. Structure métier depuis le localStorage
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    localSubjects = validateSubjects(parsed);
                } catch (e) {
                    console.error("Failed to parse subjects", e);
                }
            }
            
            // 2. Fusion avec les états "User Progress" depuis Supabase 
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: progressList, error } = await supabase
                        .from('user_progress')
                        .select('chapter_id, status');
                        
                    if (!error && progressList) {
                        localSubjects = localSubjects.map(sub => ({
                            ...sub,
                            chapters: sub.chapters.map(chap => {
                                const remoteProg = progressList.find(p => p.chapter_id === chap.id);
                                if (remoteProg) {
                                    try {
                                        return { ...chap, status: JSON.parse(remoteProg.status) };
                                    } catch(e) { 
                                        // Ignore silently if JSON is corrupted
                                    }
                                }
                                return chap;
                            })
                        }));
                    }
                }
            } catch (err) {
                console.warn("Impossible de vérifier Supabase au chargement", err);
            }

            setSubjects(localSubjects);
            setIsLoaded(true);
        };
        
        loadData();
    }, []);

    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(subjects));
        }
    }, [subjects, isLoaded]);

    const addSubject = (title: string, iconName: string, chapterTitles: string[], options?: { examDate?: string; year?: string; semester?: string }) => {
        const newSubject: Subject = {
            id: crypto.randomUUID(),
            title,
            iconName,
            chapters: chapterTitles.map(t => ({
                id: crypto.randomUUID(),
                title: t.trim(),
                status: { t1: false, annales: false, t2: false },
                progress: createDefaultProgress()
            })).filter(c => c.title !== ''),
            ...(options?.examDate && { examDate: options.examDate }),
            ...(options?.year && { year: options.year }),
            ...(options?.semester && { semester: options.semester }),
        };
        setSubjects(prev => [...prev, newSubject]);
    };

    const updateSubject = (id: string, updates: Partial<Pick<Subject, 'title' | 'iconName' | 'examDate' | 'year' | 'semester'>>) => {
        setSubjects(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    const deleteSubject = (id: string) => {
        setSubjects(prev => prev.filter(s => s.id !== id));
    };

    const addChapter = (subjectId: string, title: string) => {
        setSubjects(prev => prev.map(sub => {
            if (sub.id !== subjectId) return sub;
            return {
                ...sub,
                chapters: [...sub.chapters, {
                    id: crypto.randomUUID(),
                    title: title.trim(),
                    status: { t1: false, annales: false, t2: false },
                    progress: createDefaultProgress()
                }]
            };
        }));
    };

    const addChaptersBulk = (subjectId: string, titles: string[]) => {
        setSubjects(prev => prev.map(sub => {
            if (sub.id !== subjectId) return sub;
            const newChapters = titles
                .map(t => t.trim())
                .filter(t => t !== '')
                .map(t => ({
                    id: crypto.randomUUID(),
                    title: t,
                    status: { t1: false, annales: false, t2: false } as ChapterStatus,
                    progress: createDefaultProgress()
                }));
            return { ...sub, chapters: [...sub.chapters, ...newChapters] };
        }));
    };

    const editChapterTitle = (subjectId: string, chapterId: string, newTitle: string) => {
        setSubjects(prev => prev.map(sub => {
            if (sub.id !== subjectId) return sub;
            return {
                ...sub,
                chapters: sub.chapters.map(c =>
                    c.id === chapterId ? { ...c, title: newTitle } : c
                )
            };
        }));
    };

    const deleteChapter = (subjectId: string, chapterId: string) => {
        setSubjects(prev => prev.map(sub => {
            if (sub.id !== subjectId) return sub;
            return {
                ...sub,
                chapters: sub.chapters.filter(c => c.id !== chapterId)
            };
        }));
    };

    const toggleChapterStatus = async (subjectId: string, chapterId: string, type: keyof ChapterStatus) => {
        // MAJ Optimiste UI
        let newStatus: ChapterStatus | null = null;

        setSubjects(prev => prev.map(sub => {
            if (sub.id !== subjectId) return sub;
            return {
                ...sub,
                chapters: sub.chapters.map(c => {
                    if (c.id === chapterId) {
                        newStatus = { ...c.status, [type]: !c.status[type] };
                        return { ...c, status: newStatus };
                    }
                    return c;
                })
            };
        }));

        // Envoi silencieux à Supabase (UPSERT)
        if (newStatus) {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase.from('user_progress').upsert({
                        user_id: user.id,
                        chapter_id: chapterId,
                        status: JSON.stringify(newStatus),
                        // updated_at est généré par `NOW()` dans le SGDB automatiquement mais on informe Supabase
                    }, { onConflict: 'user_id,chapter_id' } as any); 
                    // note: le Typage de OnConflict dans le package js de Supabase est strict, 'user_id,chapter_id' fonctionne grace à la constraint Postgres UNIQUE.
                }
            } catch (err) {
                console.error("Erreur de sauvegarde sur Supabase", err);
            }
        }
    };

    const updateChapterProgress = (subjectId: string, chapterId: string, updates: Partial<ChapterProgress>) => {
        setSubjects(prev => prev.map(sub => {
            if (sub.id !== subjectId) return sub;
            return {
                ...sub,
                chapters: sub.chapters.map(c =>
                    c.id === chapterId ? {
                        ...c,
                        progress: { ...c.progress, ...updates }
                    } : c
                )
            };
        }));
    };

    return (
        <SubjectContext.Provider value={{
            subjects, addSubject, updateSubject, deleteSubject,
            addChapter, addChaptersBulk, editChapterTitle, deleteChapter,
            toggleChapterStatus, updateChapterProgress
        }}>
            {children}
        </SubjectContext.Provider>
    );
};

export const useSubjects = () => {
    const context = useContext(SubjectContext);
    if (context === undefined) {
        throw new Error('useSubjects must be used within a SubjectProvider');
    }
    return context;
};

export const getIconComponent = (iconName: string) => {
    return ICON_MAP[iconName] || BookOpen;
};

export const AVAILABLE_ICONS = [...MEDICAL_ICON_NAMES];
