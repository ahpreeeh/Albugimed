"use client";

import { Calendar as CalendarIcon } from 'lucide-react';
import type { Subject } from '@/entities/subject/hooks';
import type { StrategyMode, VacationObjective, LearningScope } from '@/entities/strategy/types';
import { DUREES } from '@/entities/strategy/types';
import { cn } from '@/shared/lib/cn';
import { SubjectMultiSelect } from './SubjectMultiSelect';

interface ModeTabsProps {
    subjects: Subject[];
    mode: StrategyMode | null;
    setMode: (mode: StrategyMode) => void;
    preparationMatieres: string[];
    togglePreparationMatiere: (id: string) => void;
    preparationDate: string;
    setPreparationDate: (value: string) => void;
    rushMatieres: string[];
    toggleRushMatiere: (id: string) => void;
    vacancesObjectif: VacationObjective | null;
    setVacancesObjectif: (value: VacationObjective) => void;
    vacancesMatieres: string[];
    toggleVacancesMatiere: (id: string) => void;
    vacancesDuree: string;
    setVacancesDuree: (value: string) => void;
    vacancesPerimetre: LearningScope | null;
    setVacancesPerimetre: (value: LearningScope) => void;
}

export const ModeTabs = ({
    subjects,
    mode,
    setMode,
    preparationMatieres,
    togglePreparationMatiere,
    preparationDate,
    setPreparationDate,
    rushMatieres,
    toggleRushMatiere,
    vacancesObjectif,
    setVacancesObjectif,
    vacancesMatieres,
    toggleVacancesMatiere,
    vacancesDuree,
    setVacancesDuree,
    vacancesPerimetre,
    setVacancesPerimetre,
}: ModeTabsProps) => (
    <>
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
                            <SubjectMultiSelect
                                label="Matières à prioriser"
                                subjects={subjects}
                                selectedIds={preparationMatieres}
                                onToggle={togglePreparationMatiere}
                            />

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
                            <SubjectMultiSelect
                                label="Matières à travailler"
                                subjects={subjects}
                                selectedIds={rushMatieres}
                                onToggle={toggleRushMatiere}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>

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

                            {vacancesObjectif === 'revision' && (
                                <div className="space-y-3 pl-3 border-l-2 border-[var(--color-border)]">
                                    <SubjectMultiSelect
                                        label="Matières à réviser"
                                        subjects={subjects}
                                        selectedIds={vacancesMatieres}
                                        onToggle={toggleVacancesMatiere}
                                    />
                                    <DurationSelect value={vacancesDuree} onChange={setVacancesDuree} label="Durée de la période" />
                                </div>
                            )}

                            {vacancesObjectif === 'apprentissage' && (
                                <div className="space-y-3 pl-3 border-l-2 border-[var(--color-border)]">
                                    <SubjectMultiSelect
                                        label="Matières à travailler"
                                        subjects={subjects}
                                        selectedIds={vacancesMatieres}
                                        onToggle={toggleVacancesMatiere}
                                    />
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
                                    <DurationSelect value={vacancesDuree} onChange={setVacancesDuree} label="Durée que vous vous fixez" />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    </>
);

interface DurationSelectProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
}

const DurationSelect = ({ label, value, onChange }: DurationSelectProps) => (
    <div>
        <label className="text-[11px] font-medium text-[var(--color-text-secondary)] mb-1.5 block">
            {label} <span className="text-[var(--color-danger)]">*</span>
        </label>
        <select value={value}
            onChange={e => onChange(e.target.value)}
            className="app-input text-xs">
            <option value="">Sélectionnez une durée</option>
            {DUREES.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
            ))}
        </select>
    </div>
);
