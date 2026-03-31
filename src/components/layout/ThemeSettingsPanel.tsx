"use client";

import React from "react";
import { Check, Settings2, X } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import type { ThemeId } from "@/lib/theme";
import { cn } from "@/lib/utils";

interface ThemeSettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const themeOptions: Array<{
    id: ThemeId;
    label: string;
    swatch: string;
}> = [
    { id: "soft-slate", label: "Soft Slate", swatch: "#5b7fa6" },
    { id: "warm-rose", label: "Warm Rose", swatch: "#c4706a" },
    { id: "indigo-night", label: "Indigo Night", swatch: "#7c6fe0" },
    { id: "sage-cream", label: "Sage & Cream", swatch: "#6b9e7a" },
    { id: "blush-lavender", label: "Blush Lavender", swatch: "#8b72be" },
];

export const ThemeSettingsPanel = ({ isOpen, onClose }: ThemeSettingsPanelProps) => {
    const { theme, setTheme } = useTheme();

    if (!isOpen) return null;

    return (
        <>
            <button
                type="button"
                aria-label="Fermer le panneau de parametres"
                className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px]"
                onClick={onClose}
            />

            <aside className="fixed inset-y-0 right-0 z-50 w-80 border-l border-[var(--color-border-default)] bg-[var(--color-bg-card)]">
                <div className="flex h-full flex-col">
                    <div className="flex items-start justify-between border-b border-[var(--color-border-default)] px-5 py-4">
                        <div className="flex items-start gap-3">
                            <span className="app-icon-box">
                                <Settings2 className="h-4 w-4" />
                            </span>
                            <div>
                                <h2 className="app-title">Parametres</h2>
                                <p className="app-meta mt-1">Apparence et gestion locale.</p>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="flex h-8 w-8 items-center justify-center rounded-[10px] text-[var(--color-text-muted)] hover:bg-[var(--color-accent-muted)] hover:text-[var(--color-accent)]"
                            aria-label="Fermer"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="custom-scrollbar flex-1 overflow-y-auto px-5 py-5">
                        <section>
                            <div className="app-kicker">THEME</div>
                            <div className="mt-2">
                                <h3 className="app-title">Apparence</h3>
                                <p className="app-meta mt-1">Choisissez la palette active.</p>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-3">
                                {themeOptions.map((option) => {
                                    const isActive = option.id === theme;
                                    return (
                                        <button
                                            key={option.id}
                                            onClick={() => setTheme(option.id)}
                                            className={cn(
                                                "relative flex h-[60px] items-center gap-3 rounded-[12px] border px-3 text-left transition-colors",
                                                isActive
                                                    ? "border-[var(--color-accent-border)] bg-[var(--color-bg-active-nav)]"
                                                    : "border-[var(--color-border-default)] bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-active-nav)]",
                                            )}
                                        >
                                            <span
                                                className="h-3 w-3 shrink-0 rounded-full"
                                                style={{ backgroundColor: option.swatch }}
                                            />
                                            <span className="text-sm font-medium leading-5 text-[var(--color-text-primary)]">
                                                {option.label}
                                            </span>
                                            {isActive && (
                                                <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-accent)] app-on-accent">
                                                    <Check className="h-3 w-3" />
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    </div>
                </div>
            </aside>
        </>
    );
};
