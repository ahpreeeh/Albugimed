"use client";

import React, { useState, useEffect } from 'react';
import { Settings2, Calendar as CalendarIcon, X, Check, Info } from 'lucide-react';
import { useSubjects } from '@/entities/subject/hooks';
import { useStrategy } from '@/entities/strategy/hooks';
import type { StrategyMode, VacationObjective, LearningScope, ActiveStrategy } from '@/entities/strategy/types';
import { DUREES } from '@/entities/strategy/types';
import { createEmptyStrategy } from '@/entities/strategy/model';
import { cn } from '@/shared/lib/cn';

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

                    {/* Mode 1 : Préparation d'examen */}
                    <div className={cn(
                        "border rounded-xl p-4 cursor-pointer transition-all",
                        mode === 'preparation'
                            ? "border-[var(--color-accent-border)] bg-[var(--color-accent-muted)]"
                            : "border-[var(--color-border)] hover:border-[var(--color-border-active)]"
                    )} onClick={() => setMode('preparation')}>
                        <div className="flex items-start gap-3">
                            <div className={cn(
                                "mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                                mode === 'preparation'
                                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
                                    : "border-[var(--color-text-hint)]"
                            )}>
                                {mode === 'preparation' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-[var(--color-text-primary)]">Préparation d&#39;examen</p>
                                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                                    Progression guidée et structurée jusqu&#39;à l&#39;échéance
                                </p>

                                {mode === 'preparation' && (
                                    <div className="mt-4 space-y-4 pl-3 border-l-2 border-[var(--color-border)]" onClick={e => e.stopPropagation()}>
                                        {/* Matières */}
                                        <div>
                                            <label className="text-[11px] font-medium text-[var(--color-text-secondary)] mb-1.5 block">
                                                Matières à prioriser <span className="text-[var(--color-danger)]">*</span>
                                            </label>
                                            <div className="flex flex-wrap gap-1.5">
                                                {subjects.map(s => (
                                                    <button key={s.id}
                                                        onClick={() => togglePreparationMatiere(s.id)}
                                                        className={cn(
                                                            "px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all",
                                                            preparationMatieres.includes(s.id)
                                                                ? "app-btn-primary text-white"
                                                                : "app-btn-secondary"
                                                        )}>
                                                        {s.title}
                                                    </button>
                                                ))}
                                                {subjects.length === 0 && (
                                                    <p className="text-[10px] text-[var(--color-text-hint)]">
                                                        Aucune matière — ajoutez-en dans la section Matières
                                                    </p>
                                                )}
                                            </div>
                                            {preparationMatieres.length > 0 && (
                                                <p className="text-[10px] text-[var(--color-text-muted)] mt-1.5">
                                                    {preparationMatieres.length} matière{preparationMatieres.length > 1 ? 's' : ''} sélectionnée{preparationMatieres.length > 1 ? 's' : ''}
                                                </p>
                                            )}
                                        </div>

                                        {/* Date */}
                                        <div>
                                            <label className="text-[11px] font-medium text-[var(--color-text-secondary)] mb-1.5 block">
                                                Date d&#39;examen <span className="text-[var(--color-danger)]">*</span>
                                            </label>
                                            <div className="relative">
                                                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-hint)]" />
                                                <input
                                                    type="date"
                                                    value={preparationDate}
                                                    onChange={e => setPreparationDate(e.target.value)}
                                                    className="app-input pl-9 text-xs"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Mode 2 : Rush */}
                    <div className={cn(
                        "border rounded-xl p-4 cursor-pointer transition-all",
                        mode === 'rush'
                            ? "border-[var(--color-accent-border)] bg-[var(--color-accent-muted)]"
                            : "border-[var(--color-border)] hover:border-[var(--color-border-active)]"
                    )} onClick={() => setMode('rush')}>
                        <div className="flex items-start gap-3">
                            <div className={cn(
                                "mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                                mode === 'rush'
                                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
                                    : "border-[var(--color-text-hint)]"
                            )}>
                                {mode === 'rush' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-[var(--color-text-primary)]">Examen (Rush)</p>
                                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                                    Intensif et focalisé sur l&#39;efficacité immédiate
                                </p>

                                {mode === 'rush' && (
                                    <div className="mt-4 space-y-3 pl-3 border-l-2 border-[var(--color-border)]" onClick={e => e.stopPropagation()}>
                                        <div>
                                            <label className="text-[11px] font-medium text-[var(--color-text-secondary)] mb-1.5 block">
                                                Matières à travailler <span className="text-[var(--color-danger)]">*</span>
                                            </label>
                                            <div className="flex flex-wrap gap-1.5">
                                                {subjects.map(s => (
                                                    <button key={s.id}
                                                        onClick={() => toggleRushMatiere(s.id)}
                                                        className={cn(
                                                            "px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all",
                                                            rushMatieres.includes(s.id)
                                                                ? "app-btn-primary text-white"
                                                                : "app-btn-secondary"
                                                        )}>
                                                        {s.title}
                                                    </button>
                                                ))}
                                                {subjects.length === 0 && (
                                                    <p className="text-[10px] text-[var(--color-text-hint)]">
                                                        Aucune matière — ajoutez-en dans la section Matières
                                                    </p>
                                                )}
                                            </div>
                                            {rushMatieres.length > 0 && (
                                                <p className="text-[10px] text-[var(--color-text-muted)] mt-1.5">
                                                    {rushMatieres.length} matière{rushMatieres.length > 1 ? 's' : ''} sélectionnée{rushMatieres.length > 1 ? 's' : ''}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Mode 3 : Vacances */}
                    <div className={cn(
                        "border rounded-xl p-4 cursor-pointer transition-all",
                        mode === 'vacances'
                            ? "border-[var(--color-accent-border)] bg-[var(--color-accent-muted)]"
                            : "border-[var(--color-border)] hover:border-[var(--color-border-active)]"
                    )} onClick={() => setMode('vacances')}>
                        <div className="flex items-start gap-3">
                            <div className={cn(
                                "mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                                mode === 'vacances'
                                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
                                    : "border-[var(--color-text-hint)]"
                            )}>
                                {mode === 'vacances' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-[var(--color-text-primary)]">Révision à long terme (Vacances)</p>
                                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                                    Flexible, pour consolider ou explorer à votre rythme
                                </p>

                                {mode === 'vacances' && (
                                    <div className="mt-4 space-y-4 pl-3 border-l-2 border-[var(--color-border)]" onClick={e => e.stopPropagation()}>
                                        {/* Objectif */}
                                        <div>
                                            <label className="text-[11px] font-medium text-[var(--color-text-secondary)] mb-2 block">
                                                Quel est votre objectif ? <span className="text-[var(--color-danger)]">*</span>
                                            </label>
                                            <div className="space-y-2">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="radio" name="vacances-obj"
                                                        checked={vacancesObjectif === 'revision'}
                                                        onChange={() => setVacancesObjectif('revision')}
                                                    />
                                                    <span className="text-[12px] text-[var(--color-text-primary)]">Réviser des chapitres existants</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="radio" name="vacances-obj"
                                                        checked={vacancesObjectif === 'apprentissage'}
                                                        onChange={() => setVacancesObjectif('apprentissage')}
                                                    />
                                                    <span className="text-[12px] text-[var(--color-text-primary)]">Apprendre de nouveaux chapitres</span>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Sub-fields for revision */}
                                        {vacancesObjectif === 'revision' && (
                                            <div className="space-y-3 pl-3 border-l-2 border-[var(--color-border)]">
                                                <div>
                                                    <label className="text-[11px] font-medium text-[var(--color-text-secondary)] mb-1.5 block">
                                                        Matières à réviser <span className="text-[var(--color-danger)]">*</span>
                                                    </label>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {subjects.map(s => (
                                                            <button key={s.id}
                                                                onClick={() => toggleVacancesMatiere(s.id)}
                                                                className={cn(
                                                                    "px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all",
                                                                    vacancesMatieres.includes(s.id)
                                                                        ? "app-btn-primary text-white"
                                                                        : "app-btn-secondary"
                                                                )}>
                                                                {s.title}
                                                            </button>
                                                        ))}
                                                        {subjects.length === 0 && (
                                                            <p className="text-[10px] text-[var(--color-text-hint)]">
                                                                Aucune matière — ajoutez-en dans la section Matières
                                                            </p>
                                                        )}
                                                    </div>
                                                    {vacancesMatieres.length > 0 && (
                                                        <p className="text-[10px] text-[var(--color-text-muted)] mt-1.5">
                                                            {vacancesMatieres.length} matière{vacancesMatieres.length > 1 ? 's' : ''} sélectionnée{vacancesMatieres.length > 1 ? 's' : ''}
                                                        </p>
                                                    )}
                                                </div>
                                                <div>
                                                    <label className="text-[11px] font-medium text-[var(--color-text-secondary)] mb-1.5 block">
                                                        Durée de la période <span className="text-[var(--color-danger)]">*</span>
                                                    </label>
                                                    <select value={vacancesDuree}
                                                        onChange={e => setVacancesDuree(e.target.value)}
                                                        className="app-input text-xs">
                                                        <option value="">Sélectionnez une durée</option>
                                                        {DUREES.map(d => (
                                                            <option key={d.value} value={d.value}>{d.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        )}

                                        {/* Sub-fields for apprentissage */}
                                        {vacancesObjectif === 'apprentissage' && (
                                            <div className="space-y-3 pl-3 border-l-2 border-[var(--color-border)]">
                                                <div>
                                                    <label className="text-[11px] font-medium text-[var(--color-text-secondary)] mb-1.5 block">
                                                        Matières à travailler <span className="text-[var(--color-danger)]">*</span>
                                                    </label>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {subjects.map(s => (
                                                            <button key={s.id}
                                                                onClick={() => toggleVacancesMatiere(s.id)}
                                                                className={cn(
                                                                    "px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all",
                                                                    vacancesMatieres.includes(s.id)
                                                                        ? "app-btn-primary text-white"
                                                                        : "app-btn-secondary"
                                                                )}>
                                                                {s.title}
                                                            </button>
                                                        ))}
                                                        {subjects.length === 0 && (
                                                            <p className="text-[10px] text-[var(--color-text-hint)]">
                                                                Aucune matière — ajoutez-en dans la section Matières
                                                            </p>
                                                        )}
                                                    </div>
                                                    {vacancesMatieres.length > 0 && (
                                                        <p className="text-[10px] text-[var(--color-text-muted)] mt-1.5">
                                                            {vacancesMatieres.length} matière{vacancesMatieres.length > 1 ? 's' : ''} sélectionnée{vacancesMatieres.length > 1 ? 's' : ''}
                                                        </p>
                                                    )}
                                                </div>
                                                <div>
                                                    <label className="text-[11px] font-medium text-[var(--color-text-secondary)] mb-2 block">
                                                        Périmètre d&#39;apprentissage <span className="text-[var(--color-danger)]">*</span>
                                                    </label>
                                                    <div className="space-y-2">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input type="radio" name="perimetre"
                                                                checked={vacancesPerimetre === 'coeur'}
                                                                onChange={() => setVacancesPerimetre('coeur')}
                                                            />
                                                            <span className="text-[12px] text-[var(--color-text-primary)]">Cœur du collège / de la matière</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input type="radio" name="perimetre"
                                                                checked={vacancesPerimetre === 'elargissement'}
                                                                onChange={() => setVacancesPerimetre('elargissement')}
                                                            />
                                                            <span className="text-[12px] text-[var(--color-text-primary)]">Élargissement au-delà du cœur</span>
                                                        </label>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[11px] font-medium text-[var(--color-text-secondary)] mb-1.5 block">
                                                        Durée que vous vous fixez <span className="text-[var(--color-danger)]">*</span>
                                                    </label>
                                                    <select value={vacancesDuree}
                                                        onChange={e => setVacancesDuree(e.target.value)}
                                                        className="app-input text-xs">
                                                        <option value="">Sélectionnez une durée</option>
                                                        {DUREES.map(d => (
                                                            <option key={d.value} value={d.value}>{d.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

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
