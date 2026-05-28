"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { STORAGE_KEYS } from "@/shared/config/storageKeys";
import { useCloudValue } from "@/shared/hooks/useCloudValue";
import {
  convertLegacyQuickNotes,
  createDefaultNotesWorkspace,
  normalizeNotesWorkspace,
} from "./model";
import type { LegacyQuickNote, NotesWorkspace } from "./types";

const LEGACY_QUICK_NOTES_V2_KEY = "med-pilot-quick-notes-v2";
const SAVE_DEBOUNCE_MS = 650;

type SaveState = "idle" | "saving" | "saved";

export interface NotesWorkspaceResult {
  workspace: NotesWorkspace;
  updateWorkspace: (
    updater: (workspace: NotesWorkspace) => NotesWorkspace,
    options?: { immediate?: boolean },
  ) => void;
  saveState: SaveState;
  isReady: boolean;
}

function persistLocal(value: NotesWorkspace) {
  try {
    localStorage.setItem(STORAGE_KEYS.notes.workspace, JSON.stringify(value));
  } catch {
    // localStorage can fail in private mode or when quota is exhausted.
  }
}

export function useNotesWorkspace(): NotesWorkspaceResult {
  const defaultWorkspace = useMemo(() => createDefaultNotesWorkspace(), []);
  const {
    data: storedWorkspace,
    save,
    isReady,
  } = useCloudValue<NotesWorkspace>(
    STORAGE_KEYS.notes.workspace,
    defaultWorkspace,
  );
  const { data: legacyQuickNotes, isReady: legacyReady } = useCloudValue<
    LegacyQuickNote[]
  >(LEGACY_QUICK_NOTES_V2_KEY, []);

  const [workspace, setWorkspace] = useState<NotesWorkspace>(() =>
    normalizeNotesWorkspace(storedWorkspace),
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestWorkspaceRef = useRef(workspace);
  const dirtyRef = useRef(false);

  useEffect(() => {
    latestWorkspaceRef.current = workspace;
  }, [workspace]);

  useEffect(() => {
    if (!dirtyRef.current) {
      setWorkspace(normalizeNotesWorkspace(storedWorkspace));
    }
  }, [storedWorkspace]);

  const scheduleSave = useCallback(
    (next: NotesWorkspace, immediate = false) => {
      persistLocal(next);
      setSaveState("saving");

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      const runSave = () => {
        save(next);
        setSaveState("saved");
        saveTimerRef.current = null;
      };

      if (immediate) {
        runSave();
        return;
      }

      saveTimerRef.current = setTimeout(runSave, SAVE_DEBOUNCE_MS);
    },
    [save],
  );

  const updateWorkspace = useCallback<NotesWorkspaceResult["updateWorkspace"]>(
    (updater, options) => {
      dirtyRef.current = true;
      setWorkspace((prev) => {
        const next = normalizeNotesWorkspace(updater(prev));
        latestWorkspaceRef.current = next;
        scheduleSave(next, options?.immediate);
        return next;
      });
    },
    [scheduleSave],
  );

  useEffect(() => {
    if (!isReady || !legacyReady) {
      return;
    }

    if (
      workspace.migratedFromQuickNotes ||
      workspace.notes.length > 0 ||
      legacyQuickNotes.length === 0
    ) {
      return;
    }

    updateWorkspace(
      (current) => {
        const normalized = normalizeNotesWorkspace(current);
        const migratedNotes = convertLegacyQuickNotes(
          legacyQuickNotes,
          normalized,
        );

        return {
          ...normalized,
          notes: [...migratedNotes, ...normalized.notes],
          migratedFromQuickNotes: true,
        };
      },
      { immediate: true },
    );
  }, [
    isReady,
    legacyReady,
    legacyQuickNotes,
    updateWorkspace,
    workspace.migratedFromQuickNotes,
    workspace.notes.length,
  ]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        save(latestWorkspaceRef.current);
      }
    };
  }, [save]);

  return {
    workspace,
    updateWorkspace,
    saveState,
    isReady: isReady && legacyReady,
  };
}
