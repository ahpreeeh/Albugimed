"use client";

import React, { useState } from "react";
import { useView, ViewType } from "@/context/ViewContext";
import { cn } from "@/lib/utils";
import {
    BookOpen,
    Calendar,
    GraduationCap,
    LayoutGrid,
    Settings,
} from "lucide-react";
import { ThemeSettingsPanel } from "@/components/layout/ThemeSettingsPanel";

const navItems: { id: ViewType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "cockpit", label: "Cockpit", icon: LayoutGrid },
    { id: "subjects", label: "Matières", icon: BookOpen },
    { id: "simulation", label: "Simulation", icon: GraduationCap },
    { id: "planning", label: "Planning", icon: Calendar },
];

const buttonBaseClass =
    "group flex h-[50px] w-[50px] items-center justify-center rounded-[14px] border transition-all duration-200";

const iconBaseClass =
    "flex h-[32px] w-[32px] items-center justify-center rounded-[10px] border transition-all duration-200";

const SidebarButton = ({
    icon: Icon,
    label,
    active = false,
    onClick,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    active?: boolean;
    onClick?: () => void;
}) => {
    return (
        <button
            onClick={onClick}
            title={label}
            aria-label={label}
            className={cn(
                buttonBaseClass,
                active
                    ? "border-[var(--color-border-active)] bg-[var(--color-bg-active-nav)] shadow-sm"
                    : "border-transparent bg-transparent hover:border-[var(--color-border-default)] hover:bg-[var(--color-bg-active-nav)]",
            )}
        >
            <span
                className={cn(
                    iconBaseClass,
                    active
                        ? "app-on-accent border-[var(--color-accent)] bg-[var(--color-accent)]"
                        : "border-transparent bg-transparent text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)]",
                )}
            >
                <Icon className="h-[22px] w-[22px]" />
            </span>
        </button>
    );
};

const SidebarLeft = () => {
    const { activeView, setActiveView } = useView();
    const [isThemePanelOpen, setIsThemePanelOpen] = useState(false);

    return (
        <>
            <aside className="app-sidebar h-full w-full px-3 py-4">
                <div className="flex h-full flex-col justify-between">
                    <div className="flex flex-col items-center gap-3">
                        <div className="mb-2 w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-black text-xl border border-[var(--color-accent-border)]">
                            MP
                        </div>
                        <div className="app-kicker text-center text-[var(--color-text-hint)]">
                            EDN 2026
                        </div>
                    </div>

                    <nav className="flex flex-1 flex-col items-center justify-center gap-3 py-6">
                        {navItems.map((item) => (
                            <SidebarButton
                                key={item.id}
                                icon={item.icon}
                                label={item.label}
                                active={activeView === item.id}
                                onClick={() => setActiveView(item.id)}
                            />
                        ))}
                    </nav>

                    <div className="flex flex-col items-center gap-3 border-t border-[var(--color-border-default)] pt-4">
                        <SidebarButton
                            icon={Settings}
                            label="Settings"
                            onClick={() => setIsThemePanelOpen(true)}
                        />
                    </div>
                </div>
            </aside>

            <ThemeSettingsPanel
                isOpen={isThemePanelOpen}
                onClose={() => setIsThemePanelOpen(false)}
            />
        </>
    );
};

export default SidebarLeft;
