// ─── App Providers ────────────────────────────────────────────────────
// Providers métier de l'app authentifiée. Ils doivent rester hors RootLayout
// pour ne pas s'initialiser sur /login avant que la session Supabase existe.
// Stores conservés entre les navigations internes au groupe `(app)/`.
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
import { EventProvider } from "@/entities/event/hooks";
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
