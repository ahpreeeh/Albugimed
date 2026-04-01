"use client";

import React from "react";
import { HomeView } from "@/components/views/HomeView";
import { SubjectsView } from "@/components/views/SubjectsView";
import { SimulationView } from "@/components/views/SimulationView";
import { PlanningView } from "@/components/views/PlanningView";


import { useView } from "@/context/ViewContext";

export default function Home() {
    const { activeView } = useView();

    return (
        <div className="h-full">
            {activeView === "cockpit" && <HomeView />}
            {activeView === "subjects" && <SubjectsView />}
            {activeView === "simulation" && <SimulationView />}
            {activeView === "planning" && <PlanningView />}
            {activeView === "coming" && (
                <div className="flex h-full min-h-[60vh] items-center justify-center">
                    <div className="text-center">
                        <p className="text-5xl mb-4">⏳✨</p>
                        <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">À venir</h2>
                        <p className="mt-2 text-sm text-[var(--color-text-muted)]">Quelque chose arrive bientôt…</p>
                    </div>
                </div>
            )}
        </div>
    );
}
