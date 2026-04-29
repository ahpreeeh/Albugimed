import type { AnnaleLevel, SessionReason, SessionTaskType } from "@/entities/session/types";
import { toLocalISOString } from "@/shared/lib/dates";

export interface SessionTimingEntry {
  taskId?: string;
  subjectId?: string;
  chapterId?: string;
  subjectTitle?: string;
  chapterTitle?: string;
  taskType?: SessionTaskType;
  annaleLevel?: AnnaleLevel;
  reason?: SessionReason;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  date?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readDate(value: unknown): Date | null {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isIsoDateOnly(value: string | undefined): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getComparableTimestamp(entry: SessionTimingEntry): number {
  const completedAt = readDate(entry.completedAt);
  if (completedAt) {
    return completedAt.getTime();
  }

  const startedAt = readDate(entry.startedAt);
  if (startedAt) {
    const durationMs = Math.max(0, entry.durationMs ?? 0);
    return startedAt.getTime() + durationMs;
  }

  if (isIsoDateOnly(entry.date)) {
    return new Date(`${entry.date}T00:00:00`).getTime();
  }

  return 0;
}

export function getSessionTimingDate(entry: SessionTimingEntry): string | undefined {
  const completedAt = readDate(entry.completedAt);
  if (completedAt) {
    return toLocalISOString(completedAt);
  }

  const startedAt = readDate(entry.startedAt);
  if (startedAt) {
    const durationMs = Math.max(0, entry.durationMs ?? 0);
    return toLocalISOString(new Date(startedAt.getTime() + durationMs));
  }

  return isIsoDateOnly(entry.date) ? entry.date : undefined;
}

export function normalizeSessionTimingEntry(value: unknown): SessionTimingEntry | null {
  if (!isRecord(value)) {
    return null;
  }

  const rawDurationMs = readNumber(value.durationMs);
  const normalized: SessionTimingEntry = {
    taskId: readString(value.taskId),
    subjectId: readString(value.subjectId),
    chapterId: readString(value.chapterId),
    subjectTitle: readString(value.subjectTitle),
    chapterTitle: readString(value.chapterTitle),
    taskType:
      value.taskType === "cours" || value.taskType === "annale"
        ? value.taskType
        : undefined,
    annaleLevel:
      value.annaleLevel === 1 ||
      value.annaleLevel === 2 ||
      value.annaleLevel === 3 ||
      value.annaleLevel === 4
        ? value.annaleLevel
        : undefined,
    reason:
      value.reason === "nouveau" ||
      value.reason === "entretien" ||
      value.reason === "revision"
        ? value.reason
        : undefined,
    startedAt: readString(value.startedAt),
    completedAt: readString(value.completedAt),
    durationMs: rawDurationMs !== undefined ? Math.max(0, rawDurationMs) : 0,
  };

  const normalizedDate = getSessionTimingDate(normalized);
  if (normalizedDate) {
    normalized.date = normalizedDate;
  } else {
    normalized.date = readString(value.date);
  }

  return normalized;
}

export function normalizeSessionTimingEntries(values: unknown): SessionTimingEntry[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => normalizeSessionTimingEntry(value))
    .filter((entry): entry is SessionTimingEntry => entry !== null)
    .sort((a, b) => getComparableTimestamp(a) - getComparableTimestamp(b));
}

export function getSessionTimingChapterKey(entry: SessionTimingEntry): string | null {
  if (entry.subjectId && entry.chapterId) {
    return `${entry.subjectId}::${entry.chapterId}`;
  }

  if (entry.subjectTitle && entry.chapterTitle) {
    return `${entry.subjectTitle.trim().toLowerCase()}::${entry.chapterTitle
      .trim()
      .toLowerCase()}`;
  }

  return null;
}

export function getSessionTimingSignature(entry: SessionTimingEntry): string {
  const chapterKey = getSessionTimingChapterKey(entry) ?? "unknown-chapter";
  const taskKey = entry.taskId ?? "unknown-task";
  const startedAt = entry.startedAt ?? "unknown-start";
  const completedAt = entry.completedAt ?? "unknown-end";
  const date = entry.date ?? "unknown-date";
  const durationMs = entry.durationMs ?? 0;

  return [taskKey, chapterKey, startedAt, completedAt, date, durationMs].join("|");
}

export function mergeSessionTimingEntries(
  ...lists: Array<unknown[] | SessionTimingEntry[] | null | undefined>
): SessionTimingEntry[] {
  const merged = new Map<string, SessionTimingEntry>();

  lists.forEach((list) => {
    normalizeSessionTimingEntries(list ?? []).forEach((entry) => {
      merged.set(getSessionTimingSignature(entry), entry);
    });
  });

  return Array.from(merged.values()).sort(
    (a, b) => getComparableTimestamp(a) - getComparableTimestamp(b),
  );
}

export function areSessionTimingEntriesEqual(
  left: SessionTimingEntry[],
  right: SessionTimingEntry[],
): boolean {
  const normalizedLeft = mergeSessionTimingEntries(left);
  const normalizedRight = mergeSessionTimingEntries(right);

  return JSON.stringify(normalizedLeft) === JSON.stringify(normalizedRight);
}
