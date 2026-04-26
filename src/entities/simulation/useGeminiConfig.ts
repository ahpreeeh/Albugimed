"use client";

/**
 * useGeminiConfig
 *
 * Charge et sauvegarde la clé API Gemini UNIQUEMENT dans Supabase (user_data).
 * - Jamais écrite dans localStorage
 * - Si une clé existe encore dans localStorage (ancienne version), elle est
 *   migrée vers Supabase puis effacée du localStorage
 * - Si l'utilisateur n'est pas connecté, l'IA est désactivée
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/utils/supabase/client";

const KEY_FIELD   = "med-pilot-gemini-key";
const MODEL_FIELD = "med-pilot-gemini-model";

export interface GeminiConfigResult {
  apiKey:     string;
  modelId:    string;
  isLoaded:   boolean;
  isLoggedIn: boolean;
  saveConfig: (key: string, model: string) => Promise<boolean>;
}

export function useGeminiConfig(): GeminiConfigResult {
  const [apiKey,     setApiKey]     = useState("");
  const [modelId,    setModelId]    = useState("");
  const [isLoaded,   setIsLoaded]   = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const supabase = useRef(createClient()).current;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          // Non connecté : IA désactivée, pas de fallback localStorage
          if (!cancelled) setIsLoaded(true);
          return;
        }

        if (!cancelled) setIsLoggedIn(true);

        // Récupérer les deux clés depuis Supabase en une seule requête
        const { data: rows } = await supabase
          .from("user_data")
          .select("data_key, data_value")
          .eq("user_id", user.id)
          .in("data_key", [KEY_FIELD, MODEL_FIELD]);

        if (cancelled) return;

        const keyRow   = rows?.find(r => r.data_key === KEY_FIELD);
        const modelRow = rows?.find(r => r.data_key === MODEL_FIELD);

        // ── Clé API ────────────────────────────────────────────────────
        if (keyRow?.data_value) {
          setApiKey(String(keyRow.data_value));
          localStorage.removeItem(KEY_FIELD); // nettoyer localStorage par sécurité
        } else {
          // Ancienne clé dans localStorage ? On migre et on efface
          const localKey = localStorage.getItem(KEY_FIELD);
          if (localKey) {
            setApiKey(localKey);
            await supabase.from("user_data").upsert(
              { user_id: user.id, data_key: KEY_FIELD, data_value: localKey },
              { onConflict: "user_id,data_key" },
            );
            localStorage.removeItem(KEY_FIELD);
          }
        }

        // ── Modèle ─────────────────────────────────────────────────────
        if (modelRow?.data_value) {
          setModelId(String(modelRow.data_value));
          localStorage.removeItem(MODEL_FIELD);
        } else {
          const localModel = localStorage.getItem(MODEL_FIELD);
          if (localModel) {
            setModelId(localModel);
            await supabase.from("user_data").upsert(
              { user_id: user.id, data_key: MODEL_FIELD, data_value: localModel },
              { onConflict: "user_id,data_key" },
            );
            localStorage.removeItem(MODEL_FIELD);
          }
        }
      } catch (err) {
        console.warn("[useGeminiConfig] Erreur de chargement", err);
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    }

    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sauvegarde : Supabase uniquement, jamais localStorage ─────────────
  const saveConfig = useCallback(async (key: string, model: string): Promise<boolean> => {
    setApiKey(key);
    setModelId(model);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const upserts: { user_id: string; data_key: string; data_value: string }[] = [
        { user_id: user.id, data_key: KEY_FIELD,   data_value: key },
        { user_id: user.id, data_key: MODEL_FIELD, data_value: model },
      ];

      await supabase.from("user_data").upsert(upserts, { onConflict: "user_id,data_key" });

      // S'assurer que localStorage est vide
      localStorage.removeItem(KEY_FIELD);
      localStorage.removeItem(MODEL_FIELD);

      return true;
    } catch (err) {
      console.error("[useGeminiConfig] Erreur de sauvegarde", err);
      return false;
    }
  }, [supabase]);

  return { apiKey, modelId, isLoaded, isLoggedIn, saveConfig };
}
