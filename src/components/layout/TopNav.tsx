"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { StrategyModal } from "@/components/features/session/StrategyModal";
import { ThemeSettingsPanel } from "@/components/layout/ThemeSettingsPanel";
import { cn } from "@/shared/lib/cn";
import {
    Stethoscope,
    LayoutGrid,
    BookOpen,
    GraduationCap,
    Calendar,
    Settings2,
    Settings,
    Sparkles,
} from "lucide-react";

// ─── Nav items ────────────────────────────────────────────────────────
// Phase 4 step 4.5 : items utilisent maintenant des paths Next.js réels.
// Les anciens id ViewType ont disparu avec ViewContext (Lot V).
const navItems: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { href: "/cockpit",    label: "Aujourd'hui", icon: LayoutGrid },
    { href: "/subjects",   label: "Matières",    icon: BookOpen },
    { href: "/simulation", label: "Simulation",  icon: GraduationCap },
    { href: "/planning",   label: "Planning",    icon: Calendar },
    { href: "/coming",     label: "À venir",     icon: Sparkles },
];

// ─── Top Navigation Bar ───────────────────────────────────────────────
const TopNav = () => {
    const pathname = usePathname();
    const [strategieOpen, setStrategieOpen] = useState(false);
    const [isThemePanelOpen, setIsThemePanelOpen] = useState(false);

    return (
        <>
            <nav
                className="sticky top-0 z-30 border-b"
                style={{
                    background: "var(--color-bg-nav, var(--color-bg-surface))",
                    borderColor: "var(--color-border)",
                }}
            >
                <div className="mx-auto max-w-[1560px] px-5 sm:px-7">
                    <div className="flex h-14 items-center justify-between gap-4">

                        {/* ── Left: Logo ── */}
                        <div className="flex items-center gap-2.5 shrink-0">
                            <div className="app-on-accent flex h-[30px] w-[30px] items-center justify-center rounded-[10px] bg-[var(--color-accent)]">
                                <Stethoscope className="h-4 w-4" />
                            </div>
                            <span className="text-[13px] font-bold text-[var(--color-text-primary)] tracking-tight">
                                AlbugiMed
                            </span>
                        </div>

                        {/* ── Center: Nav items ── */}
                        <div className="flex items-center gap-0.5">
                            {navItems.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        data-active={isActive || undefined}
                                        className={cn(
                                            "flex items-center gap-1.5 rounded-md px-2.5 sm:px-3.5 py-2 text-[13px] font-medium transition-all duration-150",
                                            isActive
                                                ? "bg-[var(--color-accent-muted)] text-[var(--color-accent)]"
                                                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-active-nav)] hover:text-[var(--color-text-primary)]"
                                        )}
                                    >
                                        <item.icon className="h-3.5 w-3.5" />
                                        <span className="hidden sm:inline">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>

                        {/* ── Right: actions ── */}
                        <div className="flex items-center gap-1 shrink-0">
                            <button
                                onClick={() => setStrategieOpen(true)}
                                className={cn(
                                    "flex items-center gap-1.5 rounded-md px-2.5 sm:px-3 py-2 text-[13px] font-medium transition-all duration-150",
                                    "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-active-nav)] hover:text-[var(--color-text-primary)]"
                                )}
                            >
                                <Settings2 className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Stratégie</span>
                            </button>
                            <button
                                onClick={() => setIsThemePanelOpen(true)}
                                title="Paramètres d'apparence"
                                className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-text-hint)] hover:bg-[var(--color-bg-active-nav)] hover:text-[var(--color-text-primary)] transition-colors"
                            >
                                <Settings className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <StrategyModal open={strategieOpen} onOpenChange={setStrategieOpen} />
            <ThemeSettingsPanel isOpen={isThemePanelOpen} onClose={() => setIsThemePanelOpen(false)} />
        </>
    );
};

export default TopNav;
