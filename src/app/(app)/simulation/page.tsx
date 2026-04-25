"use client";

import React, { useState, useCallback } from "react";
import { GraduationCap } from "lucide-react";
import { SimulatorChat } from "@/components/features/simulation/SimulatorChat";
import { ErrorPanel } from "@/components/features/simulation/ErrorPanel";
import { AnkiExport } from "@/components/features/simulation/AnkiExport";

export default function SimulationPage() {
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [showAnki, setShowAnki] = useState(false);

    const handleErrorCaptured = useCallback(() => {
        setRefreshTrigger(prev => prev + 1);
    }, []);

    if (showAnki) {
        return (
            <div className="mx-auto max-w-[1560px] h-full">
                <div className="app-card h-full overflow-hidden">
                    <AnkiExport onBack={() => setShowAnki(false)} />
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-[1560px] h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4 shrink-0">
                <span className="app-icon-box">
                    <GraduationCap className="h-4 w-4" />
                </span>
                <div>
                    <h1 className="text-[28px] font-semibold leading-none text-[var(--color-text-primary)]">
                        Simulation
                    </h1>
                    <p className="app-meta mt-1">Dossier Progressif &middot; Cahier d&apos;erreurs &middot; Export Anki</p>
                </div>
            </div>

            {/* Side-by-side layout */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
                {/* Chat — main area */}
                <div className="min-h-0">
                    <SimulatorChat onErrorCaptured={handleErrorCaptured} />
                </div>

                {/* Error panel — sidebar */}
                <div className="min-h-0 hidden lg:block">
                    <ErrorPanel
                        refreshTrigger={refreshTrigger}
                        onRequestAnki={() => setShowAnki(true)}
                    />
                </div>
            </div>
        </div>
    );
}
