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


        </div>
    );
}
