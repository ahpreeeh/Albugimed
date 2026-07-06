"use client";

/**
 * useMigration — Hook de migration localStorage → Supabase
 *
 * Lit toutes les clés connues du localStorage (préfixes med-pilot-,
 * albugi-planning- et dp_) et les transfère dans la table `user_data`
 * de Supabase, liées à l'utilisateur connecté.
 *
 * La migration ne s'exécute qu'une seule fois par navigateur : une fois
 * terminée, la clé `med-pilot-migration-done` est posée dans localStorage
 * pour éviter toute ré-exécution.
 */

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

// ─── Toutes les clés localStorage connues du projet ──────────────────────────
const KNOWN_KEYS: string[] = [
  // SubjectContext
  "med-pilot-subjects-v4",
  // StrategyContext
  "med-pilot-active-strategy",
  // SessionEngineContext / Session store
  "med-pilot-daily-session",
  "med-pilot-session-history",
  // SessionWidget (timing)
  "med-pilot-session-timing",
  // SimulatorChat / ErrorPanel
  "med-pilot-error-bank",
  // EventContext
  "med-pilot-events",
  // HomeView — divers
  "med-pilot-edn-date",
  "med-pilot-quick-tasks",
  "med-pilot-quick-notes",
  // PlanningContext
  "albugi-planning-slots",
  "albugi-planning-events",
  "albugi-planning-deadlines",
  // SimulatorChat — historique DP
  "dp_chat_history",
  "dp_last_message_time",
];

const MIGRATION_DONE_KEY = "med-pilot-migration-done";

// ─── Types ────────────────────────────────────────────────────────────────────
export type MigrationStatus =
  | "idle"          // pas encore démarré
  | "running"       // en cours
  | "done"          // terminé avec succès
  | "already_done"  // déjà effectuée sur ce navigateur
  | "skipped"       // rien à migrer (localStorage vide)
  | "error";        // erreur inattendue

export interface MigrationResult {
  status: MigrationStatus;
  migratedKeys: string[];
  skippedKeys: string[];   // clés présentes mais vides/nulles
  error?: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useMigration(userId: string | null): MigrationResult {
  const [result, setResult] = useState<MigrationResult>({
    status: "idle",
    migratedKeys: [],
    skippedKeys: [],
  });

  useEffect(() => {
    if (!userId) return;

    // Déjà migrée sur ce navigateur ?
    if (localStorage.getItem(MIGRATION_DONE_KEY) === "1") {
      setResult({ status: "already_done", migratedKeys: [], skippedKeys: [] });
      return;
    }

    let cancelled = false;

    async function runMigration() {
      setResult({ status: "running", migratedKeys: [], skippedKeys: [] });

      const supabase = createClient();
      const migratedKeys: string[] = [];
      const skippedKeys: string[] = [];

      // Construire les lignes à upsert
      const rows: { user_id: string; data_key: string; data_value: unknown }[] = [];

      for (const key of KNOWN_KEYS) {
        const raw = localStorage.getItem(key);

        if (raw === null) {
          // Clé absente du localStorage → on l'ignore
          skippedKeys.push(key);
          continue;
        }

        // Tenter un parse JSON ; si ça échoue on stocke la chaîne brute
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = raw;
        }

        rows.push({ user_id: userId!, data_key: key, data_value: parsed });
      }

      if (rows.length === 0) {
        if (!cancelled) {
          setResult({ status: "skipped", migratedKeys: [], skippedKeys });
        }
        return;
      }

      // Ne jamais écraser une donnée cloud existante avec une valeur locale
      // possiblement stale. Cette migration sert à remplir les clés absentes,
      // pas à résoudre des conflits local/cloud.
      const { data: existingRows, error: existingError } = await supabase
        .from("user_data")
        .select("data_key")
        .eq("user_id", userId)
        .in("data_key", rows.map((row) => row.data_key));

      if (existingError) {
        if (!cancelled) {
          setResult({
            status: "error",
            migratedKeys,
            skippedKeys,
            error: `Erreur Supabase pendant la vérification cloud : ${existingError.message}`,
          });
        }
        return;
      }

      const existingKeys = new Set(
        (existingRows ?? [])
          .map((row) => (row as { data_key?: unknown }).data_key)
          .filter((key): key is string => typeof key === "string"),
      );

      const rowsToMigrate = rows.filter((row) => !existingKeys.has(row.data_key));
      existingKeys.forEach((key) => skippedKeys.push(key));

      if (rowsToMigrate.length === 0) {
        localStorage.setItem(MIGRATION_DONE_KEY, "1");
        if (!cancelled) {
          setResult({ status: "done", migratedKeys: [], skippedKeys });
        }
        return;
      }

      // Upsert par lots de 50 pour rester sous les limites Supabase
      const BATCH = 50;
      for (let i = 0; i < rowsToMigrate.length; i += BATCH) {
        const batch = rowsToMigrate.slice(i, i + BATCH);
        const { error } = await supabase
          .from("user_data")
          .upsert(batch, { onConflict: "user_id,data_key" });

        if (error) {
          if (!cancelled) {
            setResult({
              status: "error",
              migratedKeys,
              skippedKeys,
              error: `Erreur Supabase sur le lot ${i / BATCH + 1} : ${error.message}`,
            });
          }
          return;
        }

        batch.forEach((r) => migratedKeys.push(r.data_key));
      }

      // Marquer la migration comme faite sur ce navigateur
      localStorage.setItem(MIGRATION_DONE_KEY, "1");

      if (!cancelled) {
        setResult({ status: "done", migratedKeys, skippedKeys });
      }
    }

    runMigration();
    return () => { cancelled = true; };
  }, [userId]);

  return result;
}
