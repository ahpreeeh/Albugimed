"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  areSessionTimingEntriesEqual,
  mergeSessionTimingEntries,
  normalizeSessionTimingEntries,
  type SessionTimingEntry,
} from "@/lib/sessionTiming";

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
  const supabase = useRef(createClient()).current;
  const dataRef = useRef<SessionTimingEntry[]>(data);

  const setDataIfChanged = useCallback((next: SessionTimingEntry[]) => {
    dataRef.current = next;
    setData((prev) => (areSessionTimingEntriesEqual(prev, next) ? prev : next));
  }, []);

  const persistToCloud = useCallback(
    async (entries: SessionTimingEntry[]) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          return;
        }

        await supabase.from("user_data").upsert(
          { user_id: user.id, data_key: STORAGE_KEY, data_value: entries },
          { onConflict: "user_id,data_key" },
        );
      } catch (err) {
        console.warn(`[useSessionTimingStorage] Save échoué pour "${STORAGE_KEY}"`, err);
      }
    },
    [supabase],
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
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (!cancelled) {
            setDataIfChanged(localEntries);
            setIsReady(true);
          }
          return;
        }

        const { data: row } = await supabase
          .from("user_data")
          .select("data_value")
          .eq("user_id", user.id)
          .eq("data_key", STORAGE_KEY)
          .maybeSingle();

        const cloudEntries = normalizeSessionTimingEntries(row?.data_value ?? []);
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
  }, [persistToCloud, setDataIfChanged, supabase]);

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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      await supabase
        .from("user_data")
        .delete()
        .eq("user_id", user.id)
        .eq("data_key", STORAGE_KEY);
    } catch (err) {
      console.warn(`[useSessionTimingStorage] Clear échoué pour "${STORAGE_KEY}"`, err);
    }
  }, [setDataIfChanged, supabase]);

  return { data, save, saveWith, clear, isReady };
}
