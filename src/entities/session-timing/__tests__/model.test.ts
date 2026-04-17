import { describe, expect, it } from "vitest";
import {
  getSessionTimingDate,
  mergeSessionTimingEntries,
  normalizeSessionTimingEntries,
} from "@/entities/session-timing/model";

describe("sessionTiming helpers", () => {
  it("rebuilds the local completion date from startedAt and duration", () => {
    const [entry] = normalizeSessionTimingEntries([
      {
        startedAt: "2026-04-05T21:30:00+02:00",
        durationMs: 30 * 60 * 1000,
        date: "2026-04-06",
      },
    ]);

    expect(entry.date).toBe("2026-04-05");
    expect(getSessionTimingDate(entry)).toBe("2026-04-05");
  });

  it("prefers the computed completion date over a stale stored date", () => {
    const [entry] = normalizeSessionTimingEntries([
      {
        startedAt: "2026-04-05T20:45:00+02:00",
        completedAt: "2026-04-05T22:15:00+02:00",
        durationMs: 90 * 60 * 1000,
        date: "2026-04-06",
      },
    ]);

    expect(entry.date).toBe("2026-04-05");
  });

  it("merges local and cloud entries without duplicating the same session", () => {
    const repeatedEntry = {
      taskId: "task-1",
      subjectId: "subject-1",
      chapterId: "chapter-1",
      subjectTitle: "Cardio",
      chapterTitle: "ECG",
      startedAt: "2026-04-01T10:00:00+02:00",
      completedAt: "2026-04-01T10:45:00+02:00",
      durationMs: 45 * 60 * 1000,
      date: "2026-04-01",
    };

    const merged = mergeSessionTimingEntries(
      [repeatedEntry],
      [repeatedEntry],
      [
        {
          taskId: "task-2",
          subjectId: "subject-1",
          chapterId: "chapter-2",
          subjectTitle: "Cardio",
          chapterTitle: "Insuffisance cardiaque",
          startedAt: "2026-04-02T10:00:00+02:00",
          completedAt: "2026-04-02T10:30:00+02:00",
          durationMs: 30 * 60 * 1000,
          date: "2026-04-02",
        },
      ],
    );

    expect(merged).toHaveLength(2);
    expect(merged.map((entry) => entry.taskId)).toEqual(["task-1", "task-2"]);
  });
});
