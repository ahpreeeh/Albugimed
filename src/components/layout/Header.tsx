"use client";

import React from "react";
import { Stethoscope } from "lucide-react";

const Header = () => {
    const todayLabel = new Intl.DateTimeFormat("fr-FR", {
        weekday: "long",
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(new Date());

    return (
        <header className="app-header sticky top-0 z-20 flex items-center justify-between px-5 sm:px-7">
            <div className="flex items-center gap-3">
                <div className="app-on-accent flex h-[30px] w-[30px] items-center justify-center rounded-[10px] bg-[var(--color-accent)]">
                    <Stethoscope className="h-4 w-4" />
                </div>

                <div className="leading-none">
                    <div className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                        AlbugiMed
                    </div>
                    <div className="app-kicker mt-1 text-[var(--color-text-muted)]">
                        EDN 2026
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 text-[var(--color-text-muted)]">
                    System <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" /> Online
                </div>
                <div className="app-pill border-[var(--color-border)] bg-[var(--color-bg-pill)] font-mono text-[10px] font-medium text-[var(--color-text-muted)]">
                    {todayLabel}
                </div>
            </div>
        </header>
    );
};

export default Header;
