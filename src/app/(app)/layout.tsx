"use client";

// ─── (app) route group — layout passthrough ──────────────────────────
//
// Réserve le route group `(app)` introduit en Phase 4 (Lot S, step 4.1).
// **DORMANT** : aucun page.tsx ne vit encore dans ce groupe, donc ce layout
// n'est rendu nulle part pour l'instant.
//
// Stratégie de migration en cascade :
//
//   Lot S  →  ce fichier (passthrough, dormant)
//   Lot T  →  `(app)/{cockpit,subjects,planning,simulation}/page.tsx` créés
//             + `src/app/page.tsx` racine fait `redirect('/cockpit')`.
//             À ce stade, RootLayout > LayoutShell continue de fournir
//             TopNav + fond + providers, et ce layout reste un passthrough
//             pour ne PAS dupliquer la shell visuelle.
//   Lot V  →  Extraction des providers vers `src/app/providers.tsx`
//             (instanciés une seule fois dans RootLayout). LayoutShell
//             est dissous : sa partie « providers » devient `<AppProviders>`,
//             sa partie « UI » (TopNav + fond) déménage ICI dans
//             `(app)/layout.tsx`. C'est à ce moment-là que ce fichier
//             cesse d'être un passthrough.
//
// Auth guard : géré côté serveur par le middleware Supabase
// (`src/utils/supabase/middleware.ts`) qui redirige `!user` vers `/login`.
// Pas de duplication client-side ici.

import type { ReactNode } from 'react';

interface AppGroupLayoutProps {
    children: ReactNode;
}

export default function AppGroupLayout({ children }: AppGroupLayoutProps) {
    return <>{children}</>;
}
