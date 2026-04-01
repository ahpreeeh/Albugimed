"use client";

/**
 * useCloudStorage<T>
 *
 * Hook générique de stockage hybride : localStorage comme cache immédiat,
 * Supabase (table `user_data`) comme source de vérité persistante.
 *
 * Comportement :
 *  1. Initialise l'état depuis localStorage immédiatement (UI instantanée)
 *  2. Au montage : récupère la valeur cloud et écrase le cache local si elle existe
 *  3. save(value)   → écrit en local + upsert cloud (fire-and-forget)
 *  4. saveWith(fn)  → mise à jour fonctionnelle (fn reçoit la valeur précédente)
 *  5. clear()       → supprime en local + supprime en cloud
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/utils/supabase/client";

export interface CloudStorageResult<T> {
  data: T;
  save: (value: T) => void;
  saveWith: (updater: (prev: T) => T) => void;
  clear: () => void;
  isReady: boolean;
}

export function useCloudStorage<T>(
  key: string,
  defaultValue: T,
): CloudStorageResult<T> {
  const [data, setData] = useState<T>(defaultValue);
  const [isReady, setIsReady] = useState(false);

  // On garde une seule instance du client Supabase par hook
  const supabase = useRef(createClient()).current;

  // ── Hydratation locale au montage ─────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        setData(JSON.parse(raw) as T);
      }
    } catch {
      // ignore
    }
  }, [key]);


  // ── Fetch cloud au montage ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function fetchFromCloud() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          // Non connecté → localStorage seul
          if (!cancelled) setIsReady(true);
          return;
        }

        const { data: row } = await supabase
          .from("user_data")
          .select("data_value")
          .eq("user_id", user.id)
          .eq("data_key", key)
          .maybeSingle();

        if (!cancelled && row?.data_value !== undefined && row.data_value !== null) {
          const cloudValue = row.data_value as T;
          setData(cloudValue);
          // Mettre à jour le cache local
          localStorage.setItem(key, JSON.stringify(cloudValue));
        }
      } catch (err) {
        console.warn(`[useCloudStorage] Fetch échoué pour "${key}"`, err);
      } finally {
        if (!cancelled) setIsReady(true);
      }
    }

    fetchFromCloud();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // ── Persistance cloud (partagé entre save et saveWith) ────────────────
  const persistToCloud = useCallback(
    async (value: T) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.from("user_data").upsert(
          { user_id: user.id, data_key: key, data_value: value },
          { onConflict: "user_id,data_key" },
        );
      } catch (err) {
        console.warn(`[useCloudStorage] Save échoué pour "${key}"`, err);
      }
    },
    [key, supabase],
  );

  // ── save : valeur directe ─────────────────────────────────────────────
  const save = useCallback(
    (value: T) => {
      setData(value);
      localStorage.setItem(key, JSON.stringify(value));
      persistToCloud(value);
    },
    [key, persistToCloud],
  );

  // ── saveWith : mise à jour fonctionnelle (évite les closures périmées) ─
  const saveWith = useCallback(
    (updater: (prev: T) => T) => {
      setData((prev) => {
        const next = updater(prev);
        localStorage.setItem(key, JSON.stringify(next));
        persistToCloud(next);
        return next;
      });
    },
    [key, persistToCloud],
  );

  // ── clear ─────────────────────────────────────────────────────────────
  const clear = useCallback(async () => {
    setData(defaultValue);
    localStorage.removeItem(key);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("user_data")
        .delete()
        .eq("user_id", user.id)
        .eq("data_key", key);
    } catch (err) {
      console.warn(`[useCloudStorage] Clear échoué pour "${key}"`, err);
    }
  }, [key, defaultValue, supabase]);

  return { data, save, saveWith, clear, isReady };
}
