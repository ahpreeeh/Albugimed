"use client";

/**
 * MigrationRunner — Composant invisible qui orchestre la migration
 *
 * Monté dans `src/app/(app)/layout.tsx` (route group `(app)`), après
 * que le middleware Supabase a confirmé l'auth. Affiche une petite
 * notification de progression, puis disparaît.
 */

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { useMigration } from "@/hooks/useMigration";

interface MigrationRunnerProps {
  userId: string;
}

export function MigrationRunner({ userId }: MigrationRunnerProps) {
  const result = useMigration(userId);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Afficher la notification uniquement quand la migration démarre réellement
  useEffect(() => {
    if (result.status === "running") setVisible(true);
  }, [result.status]);

  // Masquer automatiquement après 4 secondes une fois terminé
  useEffect(() => {
    if (result.status === "done" || result.status === "skipped") {
      const t = setTimeout(() => setDismissed(true), 4000);
      return () => clearTimeout(t);
    }
  }, [result.status]);

  if (!visible || dismissed) return null;
  if (result.status === "already_done") return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-xs rounded-xl border shadow-lg px-4 py-3 flex items-start gap-3"
      style={{
        background: "var(--color-bg-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      {result.status === "running" && (
        <>
          <Loader2 className="h-4 w-4 text-[var(--color-accent)] animate-spin mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-[var(--color-text-primary)]">Migration en cours…</p>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
              Transfert de vos données locales vers le cloud.
            </p>
          </div>
        </>
      )}

      {result.status === "done" && (
        <>
          <CheckCircle2 className="h-4 w-4 text-[var(--color-success)] mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-[var(--color-text-primary)]">Migration terminée ✓</p>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
              {result.migratedKeys.length} clé{result.migratedKeys.length > 1 ? "s" : ""} synchronisée{result.migratedKeys.length > 1 ? "s" : ""} avec Supabase.
            </p>
          </div>
        </>
      )}

      {result.status === "skipped" && (
        <>
          <CheckCircle2 className="h-4 w-4 text-[var(--color-text-muted)] mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-[var(--color-text-primary)]">Aucune donnée locale</p>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
              Le localStorage est vide, rien à migrer.
            </p>
          </div>
        </>
      )}

      {result.status === "error" && (
        <>
          <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-[var(--color-text-primary)]">Erreur de migration</p>
            <p className="text-[10px] text-red-400 mt-0.5 break-words">{result.error}</p>
          </div>
        </>
      )}
    </div>
  );
}
