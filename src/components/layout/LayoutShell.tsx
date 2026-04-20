"use client";

import React, { useEffect, useState } from 'react';
import TopNav from './TopNav';
import { ViewProvider } from '@/context/ViewContext';
import { SubjectProvider } from '@/entities/subject/hooks';
import { EventProvider } from '@/context/EventContext';
import { PlanningProvider } from '@/context/PlanningContext';
import { StrategyProvider } from '@/context/StrategyContext';
import { SessionEngineProvider } from '@/context/SessionEngineContext';
import { MigrationRunner } from '@/components/features/migration/MigrationRunner';
import { createClient } from '@/utils/supabase/client';

interface LayoutShellProps {
    children: React.ReactNode;
}

const LayoutShell = ({ children }: LayoutShellProps) => {
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
        <SubjectProvider>
            <EventProvider>
                <PlanningProvider>
                    <StrategyProvider>
                        <SessionEngineProvider>
                            <ViewProvider>
                                <div className="theme-medpilot app-shell relative w-full min-h-screen flex flex-col">
                                    {/* Top navigation bar — replaces the left sidebar */}
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
                            </ViewProvider>
                        </SessionEngineProvider>
                    </StrategyProvider>
                </PlanningProvider>
            </EventProvider>
        </SubjectProvider>
    );
};

export default LayoutShell;
