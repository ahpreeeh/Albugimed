// ─── App Providers ────────────────────────────────────────────────────
// Phase 4 step 4.7 : tous les providers métier de l'app, instanciés
// **une seule fois** dans le RootLayout. Stores conservés entre les
// navigations entre routes — pas de démontage/remontage.
//
// Chaîne de providers (ordre conservé depuis l'ancien LayoutShell) :
//   SubjectProvider > EventProvider > PlanningProvider > StrategyProvider
//
// Volontairement hors :
//   - ThemeProvider : reste dans RootLayout pour être disponible sur
//     /login et /restore (pages publiques, hors `(app)/`)
//   - ViewProvider : supprimé en step 4.7 — remplacé par les vraies routes
//     Next.js (cf. Phase 4 lots T + U)

"use client";

import type { ReactNode } from "react";
import { SubjectProvider } from "@/entities/subject/hooks";
import { EventProvider } from "@/context/EventContext";
import { PlanningProvider } from "@/entities/planning/hooks";
import { StrategyProvider } from "@/entities/strategy/hooks";

interface AppProvidersProps {
    children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
    return (
        <SubjectProvider>
            <EventProvider>
                <PlanningProvider>
                    <StrategyProvider>
                        {children}
                    </StrategyProvider>
                </PlanningProvider>
            </EventProvider>
        </SubjectProvider>
    );
}
