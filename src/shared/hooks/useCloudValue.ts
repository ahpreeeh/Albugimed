"use client";

/**
 * useCloudValue<T>
 *
 * Hook générique de stockage hybride, construit sur `userDataRepository`.
 * Successeur de `useCloudStorage` — même API publique, même comportement,
 * mais tous les accès Supabase passent par le repository générique.
 *
 * Comportement :
 *  1. Initialise l'état depuis localStorage immédiatement (UI instantanée)
 *  2. Au montage : récupère la valeur cloud et écrase le cache local si elle existe
 *  3. save(value)   → écrit en local + upsert cloud (fire-and-forget)
 *  4. saveWith(fn)  → mise à jour fonctionnelle (fn reçoit la valeur précédente)
 *  5. clear()       → supprime en local + supprime en cloud
 */

import { useState, useEffect, useCallback } from "react";
import { userDataRepository } from "@/shared/api/userDataRepository";

export interface CloudValueResult<T> {
  data: T;
  save: (value: T) => void;
  saveWith: (updater: (prev: T) => T) => void;
  clear: () => void;
  isReady: boolean;
}

export function useCloudValue<T>(
  key: string,
  defaultValue: T,
): CloudValueResult<T> {
  const [data, setData] = useState<T>(defaultValue);
  const [isReady, setIsReady] = useState(false);

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
        const cloudValue = await userDataRepository.get<T>(key);
        if (!cancelled && cloudValue !== null && cloudValue !== undefined) {
          setData(cloudValue);
          localStorage.setItem(key, JSON.stringify(cloudValue));
        }
      } catch (err) {
        console.warn(`[useCloudValue] Fetch échoué pour "${key}"`, err);
      } finally {
        if (!cancelled) setIsReady(true);
      }
    }

    fetchFromCloud();
    return () => {
      cancelled = true;
    };
  }, [key]);

  // ── save : valeur directe ─────────────────────────────────────────────
  const save = useCallback(
    (value: T) => {
      setData(value);
      localStorage.setItem(key, JSON.stringify(value));
      userDataRepository.set(key, value);
    },
    [key],
  );

  // ── saveWith : mise à jour fonctionnelle (évite les closures périmées) ─
  const saveWith = useCallback(
    (updater: (prev: T) => T) => {
      setData((prev) => {
        const next = updater(prev);
        localStorage.setItem(key, JSON.stringify(next));
        userDataRepository.set(key, next);
        return next;
      });
    },
    [key],
  );

  // ── clear ─────────────────────────────────────────────────────────────
  const clear = useCallback(() => {
    setData(defaultValue);
    localStorage.removeItem(key);
    userDataRepository.remove(key);
  }, [key, defaultValue]);

  return { data, save, saveWith, clear, isReady };
}
