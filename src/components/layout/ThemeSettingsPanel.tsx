"use client";

import { Check, Settings2, X, Download, Upload, LogOut, Loader2 } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import type { ThemeId } from "@/shared/lib/theme";
import { cn } from "@/shared/lib/cn";
import { createClient } from "@/utils/supabase/client";
import { useRef, useState } from "react";

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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleExport = async () => {
        try {
            setIsLoading(true);
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                alert("Vous n'êtes pas connecté.");
                return;
            }

            const { data: rows, error } = await supabase
                .from('user_data')
                .select('data_key, data_value')
                .eq('user_id', user.id);
            
            if (error) throw error;

            const exportData = rows || [];
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const dateStr = new Date().toISOString().split('T')[0];
            a.download = `albugimed-export-${dateStr}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Export error", err);
            alert("Erreur lors de l'export des données.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleImportClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Réinitialiser la valeur pour permettre la sélection du même fichier plusieurs fois
        e.target.value = '';

        const confirmation = window.confirm("ATTENTION : Cette action va remplacer toutes vos données actuelles métier (Matières, Sessions, événements, etc.) par celles du fichier importé. Voulez-vous continuer ?");
        if (!confirmation) return;

        try {
            setIsLoading(true);
            const text = await file.text();
            let parsedData;
            try {
                parsedData = JSON.parse(text);
            } catch (err) {
                alert("Le fichier sélectionné n'est pas un JSON valide.");
                return;
            }

            if (!Array.isArray(parsedData) || !parsedData.every(item => item.data_key && item.data_value)) {
                alert("La structure du fichier JSON est invalide pour cet import.");
                return;
            }

            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                alert("Vous n'êtes pas connecté.");
                return;
            }

            const upsertPayload = parsedData.map(item => ({
                user_id: user.id,
                data_key: item.data_key,
                data_value: item.data_value
            }));

            const { error } = await supabase.from('user_data').upsert(upsertPayload, { onConflict: 'user_id,data_key' });
            if (error) throw error;

            parsedData.forEach(item => {
                localStorage.setItem(item.data_key, JSON.stringify(item.data_value));
            });

            alert("Importation réussie. L'application va se recharger.");
            window.location.reload();
        } catch (err) {
            console.error("Import error", err);
            alert("Erreur lors de l'importation des données.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        const confirmation = window.confirm("Voulez-vous vraiment vous déconnecter ?");
        if (!confirmation) return;

        try {
            setIsLoading(true);
            const supabase = createClient();
            await supabase.auth.signOut({ scope: 'local' });

            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('med-pilot-')) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));

            window.location.href = '/login';
        } catch (err) {
            console.error("Logout error", err);
            alert("Erreur lors de la déconnexion.");
            setIsLoading(false);
        }
    };

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

                        <section className="mt-8 border-t border-[var(--color-border-default)] pt-6">
                            <div className="app-kicker text-[var(--color-status-error)]">COMPTE ET DONNÉES</div>
                            <div className="mt-2 text-sm text-[var(--color-text-secondary)]">
                                Gérez vos données locales et votre session.
                            </div>

                            <div className="mt-4 flex flex-col gap-3">
                                <button
                                    onClick={handleExport}
                                    disabled={isLoading}
                                    className="flex w-full items-center justify-between rounded-[12px] border border-[var(--color-border-default)] bg-[var(--color-bg-card)] px-4 py-3 text-left transition-colors hover:bg-[var(--color-bg-active-nav)] disabled:opacity-50"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                        </div>
                                        <span className="text-sm font-medium text-[var(--color-text-primary)]">
                                            Exporter les données
                                        </span>
                                    </div>
                                </button>

                                <button
                                    onClick={handleImportClick}
                                    disabled={isLoading}
                                    className="flex w-full items-center justify-between rounded-[12px] border border-[var(--color-border-default)] bg-[var(--color-bg-card)] px-4 py-3 text-left transition-colors hover:bg-[var(--color-bg-active-nav)] disabled:opacity-50"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                                            <Upload className="h-4 w-4" />
                                        </div>
                                        <span className="text-sm font-medium text-[var(--color-text-primary)]">
                                            Importer des données
                                        </span>
                                    </div>
                                </button>
                                <input
                                    type="file"
                                    accept=".json"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                />

                                <div className="mt-2">
                                    <button
                                        onClick={handleLogout}
                                        disabled={isLoading}
                                        className="flex w-full items-center justify-center gap-2 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        <span className="text-sm font-medium">Se déconnecter</span>
                                    </button>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </aside>
        </>
    );
};
