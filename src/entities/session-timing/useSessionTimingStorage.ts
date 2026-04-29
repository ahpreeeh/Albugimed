"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { userDataRepository } from "@/shared/api/userDataRepository";
import {
  areSessionTimingEntriesEqual,
  mergeSessionTimingEntries,
  normalizeSessionTimingEntries,
  type SessionTimingEntry,
} from "@/entities/session-timing/model";

const STORAGE_KEY = "med-pilot-session-timing";
const SYNC_EVENT_NAME = "albugi:session-timing-sync";

export interface SessionTimingStorageResult {
  data: SessionTimingEntry[];
  save: (value: SessionTimingEntry[]) => void;
  saveWith: (updater: (prev: SessionTimingEntry[]) => SessionTimingEntry[]) => void;
  clear: () => void;
  isReady: boolean;
}

function readLocalEntries(): SessionTimingEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return [];
    }

    return normalizeSessionTimingEntries(JSON.parse(raw));
  } catch {
    return [];
  }
}

function writeLocalEntries(entries: SessionTimingEntry[]) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function dispatchSync(entries: SessionTimingEntry[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<SessionTimingEntry[]>(SYNC_EVENT_NAME, {
      detail: entries,
    }),
  );
}

export function useSessionTimingStorage(): SessionTimingStorageResult {
  const [data, setData] = useState<SessionTimingEntry[]>(() => readLocalEntries());
  const [isReady, setIsReady] = useState(false);
  const dataRef = useRef<SessionTimingEntry[]>(data);

  const setDataIfChanged = useCallback((next: SessionTimingEntry[]) => {
    dataRef.current = next;
    setData((prev) => (areSessionTimingEntriesEqual(prev, next) ? prev : next));
  }, []);

  const persistToCloud = useCallback(
    async (entries: SessionTimingEntry[]) => {
      try {
        await userDataRepository.set(STORAGE_KEY, entries);
      } catch (err) {
        console.warn(`[useSessionTimingStorage] Save échoué pour "${STORAGE_KEY}"`, err);
      }
    },
    [],
  );

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    const localEntries = readLocalEntries();
    if (!areSessionTimingEntriesEqual(localEntries, dataRef.current)) {
      writeLocalEntries(localEntries);
      setDataIfChanged(localEntries);
    }
  }, [setDataIfChanged]);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const localEntries = readLocalEntries();

      try {
        const cloudValue = await userDataRepository.get<SessionTimingEntry[]>(STORAGE_KEY);

        // Pas de valeur cloud (user non connecté ou clé absente) : on reste sur le local.
        if (cloudValue === null) {
          if (!cancelled) {
            setDataIfChanged(localEntries);
          }
          return;
        }

        const cloudEntries = normalizeSessionTimingEntries(cloudValue);
        const mergedEntries = mergeSessionTimingEntries(localEntries, cloudEntries);

        if (!cancelled) {
          writeLocalEntries(mergedEntries);
          setDataIfChanged(mergedEntries);
        }

        if (!areSessionTimingEntriesEqual(cloudEntries, mergedEntries)) {
          await persistToCloud(mergedEntries);
        }
      } catch (err) {
        console.warn(
          `[useSessionTimingStorage] Fetch échoué pour "${STORAGE_KEY}"`,
          err,
        );
      } finally {
        if (!cancelled) {
          setIsReady(true);
        }
      }
    }

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [persistToCloud, setDataIfChanged]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleSync = (event: Event) => {
      const customEvent = event as CustomEvent<SessionTimingEntry[]>;
      const next = normalizeSessionTimingEntries(customEvent.detail ?? []);
      setDataIfChanged(next);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) {
        return;
      }

      try {
        const next = normalizeSessionTimingEntries(
          event.newValue ? JSON.parse(event.newValue) : [],
        );
        setDataIfChanged(next);
      } catch {
        setDataIfChanged([]);
      }
    };

    window.addEventListener(SYNC_EVENT_NAME, handleSync as EventListener);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(SYNC_EVENT_NAME, handleSync as EventListener);
      window.removeEventListener("storage", handleStorage);
    };
  }, [setDataIfChanged]);

  const save = useCallback(
    (value: SessionTimingEntry[]) => {
      const next = mergeSessionTimingEntries(value);
      writeLocalEntries(next);
      setDataIfChanged(next);
      dispatchSync(next);
      persistToCloud(next);
    },
    [persistToCloud, setDataIfChanged],
  );

  const saveWith = useCallback(
    (updater: (prev: SessionTimingEntry[]) => SessionTimingEntry[]) => {
      const baseEntries = mergeSessionTimingEntries(dataRef.current, readLocalEntries());
      const next = mergeSessionTimingEntries(updater(baseEntries));
      writeLocalEntries(next);
      setDataIfChanged(next);
      dispatchSync(next);
      persistToCloud(next);
    },
    [persistToCloud, setDataIfChanged],
  );

  const clear = useCallback(async () => {
    setDataIfChanged([]);

    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
      dispatchSync([]);
    }

    try {
      await userDataRepository.remove(STORAGE_KEY);
    } catch (err) {
      console.warn(`[useSessionTimingStorage] Clear échoué pour "${STORAGE_KEY}"`, err);
    }
  }, [setDataIfChanged]);

  return { data, save, saveWith, clear, isReady };
}
