"use client";

// ─── (app) route group — visual shell ────────────────────────────────
//
// Phase 4 step 4.7 : ce layout porte désormais la shell visuelle de
// l'app authentifiée (TopNav + fond + MigrationRunner). Avant Lot V,
// c'est `LayoutShell.tsx` au RootLayout qui fournissait cette UI à TOUTE
// route (y compris /login et /restore).
//
// Désormais :
//   - RootLayout : html + body + ThemeProvider + AppProviders → enfants
//   - (app)/layout.tsx : TopNav + main + fond → enfants (= cockpit, etc.)
//   - /login et /restore : pas de shell (UI de login propre)
//
// Auth : déjà gérée par le middleware Supabase
// (`src/utils/supabase/middleware.ts`) qui redirige `!user` vers /login.
// Pas besoin d'un guard client-side ici.

import { useEffect, useState, type ReactNode } from "react";
import TopNav from "@/components/layout/TopNav";
import { AppProviders } from "@/app/providers";
import { MigrationRunner } from "@/features/migration-notice/MigrationRunner";
import { createClient } from "@/utils/supabase/client";

interface AppGroupLayoutProps {
    children: ReactNode;
}

export default function AppGroupLayout({ children }: AppGroupLayoutProps) {
    const [userId, setUserId] = useState<string | null>(null);

    // Récupère l'userId de la session Supabase courante
    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getSession().then(({ data }) => {
            setUserId(data.session?.user.id ?? null);
        });

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            setUserId(session?.user.id ?? null);
        });

        return () => listener.subscription.unsubscribe();
    }, []);

    return (
        <AppProviders>
        <div className="theme-medpilot app-shell relative w-full min-h-screen flex flex-col">
            {/* Top navigation bar */}
            <TopNav />

            {/* Main content area */}
            <main className="relative flex-1 overflow-hidden">
                <div
                    className="pointer-events-none absolute inset-0 opacity-60"
                    style={{
                        backgroundImage:
                            "radial-gradient(circle at top left, color-mix(in srgb, var(--color-bg-card) 76%, transparent), transparent 24%), radial-gradient(circle at 85% 12%, color-mix(in srgb, var(--color-accent-muted) 74%, transparent), transparent 22%), linear-gradient(to right, color-mix(in srgb, var(--color-border-default) 46%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--color-border-default) 46%, transparent) 1px, transparent 1px)",
                        backgroundSize: "auto, auto, 44px 44px, 44px 44px",
                    }}
                />
                <div className="relative z-10 h-full overflow-y-auto overflow-x-hidden px-5 py-6 sm:px-6 lg:px-8 lg:py-7">
                    {children}
                </div>
            </main>

            {/* Migration localStorage → Supabase (s'exécute une seule fois après login) */}
            {userId && <MigrationRunner userId={userId} />}
        </div>
        </AppProviders>
    );
}
