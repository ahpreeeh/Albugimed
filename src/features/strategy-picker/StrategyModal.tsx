"use client";

import React, { useState, useEffect } from 'react';
import { Settings2, X, Check, Info } from 'lucide-react';
import { useSubjects } from '@/entities/subject/hooks';
import { useStrategy } from '@/entities/strategy/hooks';
import type { StrategyMode, VacationObjective, LearningScope, ActiveStrategy } from '@/entities/strategy/types';
import { createEmptyStrategy } from '@/entities/strategy/model';
import { cn } from '@/shared/lib/cn';
import { ModeTabs } from './ModeTabs';

interface StrategyModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const StrategyModal = ({ open, onOpenChange }: StrategyModalProps) => {
    const { subjects } = useSubjects();
    const { strategy, setStrategy } = useStrategy();

    // Local form state
    const [mode, setMode] = useState<StrategyMode | null>(null);
    const [preparationMatieres, setPreparationMatieres] = useState<string[]>([]);
    const [preparationDate, setPreparationDate] = useState('');
    const [rushMatieres, setRushMatieres] = useState<string[]>([]);
    const [vacancesObjectif, setVacancesObjectif] = useState<VacationObjective | null>(null);
    const [vacancesMatieres, setVacancesMatieres] = useState<string[]>([]);
    const [vacancesDuree, setVacancesDuree] = useState('');
    const [vacancesPerimetre, setVacancesPerimetre] = useState<LearningScope | null>(null);

    // Sync from existing strategy on open
    // All fields use ?? fallbacks to guard against stale localStorage data
    // from older strategy formats (which had different field names).
    useEffect(() => {
        if (open && strategy) {
            setMode(strategy.mode ?? null);
            setPreparationMatieres(Array.isArray(strategy.preparationSubjectIds) ? strategy.preparationSubjectIds : []);
            setPreparationDate(strategy.preparationDeadline ?? '');
            setRushMatieres(Array.isArray(strategy.rushSubjectIds) ? strategy.rushSubjectIds : []);
            setVacancesObjectif(strategy.vacancesObjectif ?? null);
            setVacancesMatieres(Array.isArray(strategy.vacancesSubjectIds) ? strategy.vacancesSubjectIds : []);
            setVacancesDuree(strategy.vacancesDuree ?? '');
            setVacancesPerimetre(strategy.vacancesPerimetre ?? null);
        } else if (open && !strategy) {
            setMode(null);
            setPreparationMatieres([]);
            setPreparationDate('');
            setRushMatieres([]);
            setVacancesObjectif(null);
            setVacancesMatieres([]);
            setVacancesDuree('');
            setVacancesPerimetre(null);
        }
    }, [open, strategy]);

    const togglePreparationMatiere = (id: string) => {
        setPreparationMatieres(prev =>
            prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
        );
    };

    const toggleRushMatiere = (id: string) => {
        setRushMatieres(prev =>
            prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
        );
    };

    const toggleVacancesMatiere = (id: string) => {
        setVacancesMatieres(prev =>
            prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
        );
    };

    // Validation
    const isFormValid = (): boolean => {
        if (!mode) return false;
        switch (mode) {
            case 'preparation':
                return preparationMatieres.length > 0 && preparationDate !== '';
            case 'rush':
                return rushMatieres.length > 0;
            case 'vacances':
                if (!vacancesObjectif || vacancesMatieres.length === 0 || !vacancesDuree) return false;
                if (vacancesObjectif === 'apprentissage' && !vacancesPerimetre) return false;
                return true;
        }
    };

    // Info message
    const getInfoMessage = (): string | null => {
        if (!mode) return null;
        switch (mode) {
            case 'preparation':
                return "Le moteur suivra une progression stricte : Cycle 1 (cours + annales N1), Cycle 2 (annales N3/4 par packs), Cycle 3 (annales pures). Les sessions seront structurées et guidées.";
            case 'rush':
                return "Mode intensif : focus sur les chapitres non faits, les items « cœur du collège » et les annales de haut niveau. Rythme soutenu.";
            case 'vacances':
                if (vacancesObjectif === 'revision')
                    return "Focus sur la consolidation des acquis, avec des annales et de l'entraînement. Les chapitres seront regroupés par thèmes proches.";
                if (vacancesObjectif === 'apprentissage')
                    return "Progression sur de nouveaux chapitres avec le cours + annales N1, à un rythme adapté à la durée choisie.";
                return "Choisissez un objectif pour voir l'impact sur les sessions.";
        }
    };

    const handleValidate = () => {
        if (!mode || !isFormValid()) return;

        const newStrategy: ActiveStrategy = {
            ...createEmptyStrategy(),
            mode,
            preparationSubjectIds: mode === 'preparation' ? preparationMatieres : [],
            preparationDeadline: mode === 'preparation' && preparationDate ? preparationDate : null,
            rushSubjectIds: mode === 'rush' ? rushMatieres : [],
            vacancesObjectif: mode === 'vacances' ? vacancesObjectif : null,
            vacancesSubjectIds: mode === 'vacances' ? vacancesMatieres : [],
            vacancesDuree: mode === 'vacances' && vacancesDuree ? vacancesDuree : null,
            vacancesPerimetre: mode === 'vacances' && vacancesObjectif === 'apprentissage' ? vacancesPerimetre : null,
            createdAt: Date.now(),
        };

        setStrategy(newStrategy);
        onOpenChange(false);
    };

    if (!open) return null;

    return (
        <div className="app-modal-backdrop" onClick={() => onOpenChange(false)}>
            <div
                className="app-modal-panel max-w-2xl max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
                    <div>
                        <h2 className="app-title text-base flex items-center gap-2">
                            <Settings2 className="h-4 w-4 text-[var(--color-accent)]" />
                            Stratégie de travail
                        </h2>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                            Choisissez un mode de travail. Le système adaptera automatiquement les recommandations.
                        </p>
                    </div>
                    <button onClick={() => onOpenChange(false)}
                        className="text-[var(--color-text-hint)] hover:text-[var(--color-text-primary)] transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4">

                    <ModeTabs
                        subjects={subjects}
                        mode={mode}
                        setMode={setMode}
                        preparationMatieres={preparationMatieres}
                        togglePreparationMatiere={togglePreparationMatiere}
                        preparationDate={preparationDate}
                        setPreparationDate={setPreparationDate}
                        rushMatieres={rushMatieres}
                        toggleRushMatiere={toggleRushMatiere}
                        vacancesObjectif={vacancesObjectif}
                        setVacancesObjectif={setVacancesObjectif}
                        vacancesMatieres={vacancesMatieres}
                        toggleVacancesMatiere={toggleVacancesMatiere}
                        vacancesDuree={vacancesDuree}
                        setVacancesDuree={setVacancesDuree}
                        vacancesPerimetre={vacancesPerimetre}
                        setVacancesPerimetre={setVacancesPerimetre}
                    />
                    {/* Info message */}
                    {getInfoMessage() && (
                        <div className="flex items-start gap-2.5 rounded-xl p-3 bg-[var(--color-accent-muted)] border border-[var(--color-accent-border)]">
                            <Info className="h-3.5 w-3.5 text-[var(--color-accent)] mt-0.5 shrink-0" />
                            <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
                                <span className="font-semibold text-[var(--color-accent)]">Impact sur l&#39;exécution : </span>
                                {getInfoMessage()}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2, p-5 border-t border-[var(--color-border)]">
                    <button onClick={() => onOpenChange(false)} className="app-btn app-btn-secondary text-xs">
                        Annuler
                    </button>
                    <button onClick={handleValidate}
                        disabled={!isFormValid()}
                        className={cn(
                            "app-btn app-btn-primary text-xs flex items-center gap-1.5",
                            !isFormValid() && "opacity-50 cursor-not-allowed"
                        )}>
                        <Check className="h-3.5 w-3.5" />
                        Valider
                    </button>
                </div>
            </div>
        </div>
    );
};
