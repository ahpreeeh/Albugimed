// ─── Planning grid — styling tokens ──────────────────────────────────
// Couleurs des cartes / dots / badges par type d'événement planning,
// utilisées par GridBlock dans le mode "week" du planning.
// Extrait de PlanningView.tsx (Phase 5 step 5.4).

import type { PlanningEventType } from '@/entities/planning/types';

export const TYPE_COLORS: Record<PlanningEventType, { card: string; dot: string; badge: string }> = {
    revision: {
        card: "border-l-[var(--color-accent)] bg-[var(--color-accent-muted)]",
        dot: "bg-[var(--color-accent)]",
        badge: "app-badge-accent",
    },
    cours: {
        card: "border-l-[var(--color-secondary)] bg-[var(--color-secondary-muted)]",
        dot: "bg-[var(--color-secondary)]",
        badge: "border-[var(--color-secondary-border)] bg-[var(--color-secondary-muted)] text-[var(--color-secondary)]",
    },
    exam: {
        card: "border-l-[var(--color-danger)] bg-[var(--color-danger-muted)]",
        dot: "bg-[var(--color-danger)]",
        badge: "border-[var(--color-danger-border)] bg-[var(--color-danger-muted)] text-[var(--color-danger)]",
    },
    perso: {
        card: "border-l-[var(--color-success)] bg-[var(--color-success-muted)]",
        dot: "bg-[var(--color-success)]",
        badge: "border-[var(--color-success-border)] bg-[var(--color-success-muted)] text-[var(--color-success)]",
    },
};

export const ACTIVE_BAR_COLORS: Record<PlanningEventType, string> = {
    revision: "bg-[var(--color-accent)]",
    cours: "bg-[var(--color-secondary)]",
    exam: "bg-[var(--color-danger)]",
    perso: "bg-[var(--color-success)]",
};
