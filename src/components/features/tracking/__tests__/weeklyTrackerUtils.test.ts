import type { Subject } from "@/context/SubjectContext";
import { calculateWeeklyTrackerSnapshot } from "@/components/features/tracking/weeklyTrackerUtils";
import type { ActiveStrategy } from "@/types/strategy";
import { describe, expect, it } from "vitest";

function makeChapter(id: string, completed = false) {
  return {
    id,
    title: `Chapitre ${id}`,
    status: { t1: false, annales: false, t2: false },
    progress: {
      courseStarted: completed,
      level1Done: completed,
      reactivationDone: false,
      advancedDone: false,
      firstSeenDate: null,
      lastWorkedDate: null,
      lastTrainingDate: null,
      lastReviewDifficulty: undefined,
      nextReviewDate: null,
    },
  };
}

function makeSubject(id: string, chapterCount: number, completedCount = 0): Subject {
  return {
    id,
    title: `Matière ${id}`,
    iconName: "BookOpen",
    chapters: Array.from({ length: chapterCount }, (_, index) =>
      makeChapter(`${id}-${index + 1}`, index < completedCount),
    ),
  };
}

function makePreparationStrategy(subjectId: string): ActiveStrategy {
  return {
    mode: "preparation",
    preparationSubjectIds: [subjectId],
    preparationDeadline: "2026-06-01",
    rushSubjectIds: [],
    vacancesObjectif: null,
    vacancesSubjectIds: [],
    vacancesDuree: null,
    vacancesPerimetre: null,
    createdAt: new Date("2026-04-01T09:00:00+02:00").getTime(),
  };
}

describe("weeklyTrackerUtils", () => {
  it("calculates the weekly goal from remaining chapters, not raw timing count", () => {
    const subjects = [makeSubject("subject-1", 88)];
    const strategy = makePreparationStrategy("subject-1");
    const repeatedTimings = Array.from({ length: 87 }, (_, index) => ({
      taskId: `task-${index + 1}`,
      subjectId: "subject-1",
      chapterId: "subject-1-1",
      subjectTitle: "Matière subject-1",
      chapterTitle: "Chapitre subject-1-1",
      startedAt: "2026-04-06T10:00:00+02:00",
      completedAt: "2026-04-06T10:45:00+02:00",
      durationMs: 45 * 60 * 1000,
      date: "2026-04-06",
    }));

    const snapshot = calculateWeeklyTrackerSnapshot({
      currentDate: new Date("2026-04-06T12:00:00+02:00"),
      now: new Date("2026-04-06T12:00:00+02:00"),
      strategy,
      subjects,
      timings: repeatedTimings,
    });

    expect(snapshot.weeklyCourseGoal).toBe(14);
    expect(snapshot.weeklyChaptersDone).toBe(1);
  });

  it("counts unique chapters worked during the week", () => {
    const subjects = [makeSubject("subject-1", 12, 3)];
    const strategy = makePreparationStrategy("subject-1");

    const snapshot = calculateWeeklyTrackerSnapshot({
      currentDate: new Date("2026-04-06T12:00:00+02:00"),
      now: new Date("2026-04-06T12:00:00+02:00"),
      strategy,
      subjects,
      timings: [
        {
          taskId: "task-1",
          subjectId: "subject-1",
          chapterId: "subject-1-1",
          subjectTitle: "Matière subject-1",
          chapterTitle: "Chapitre subject-1-1",
          startedAt: "2026-04-07T08:00:00+02:00",
          completedAt: "2026-04-07T08:30:00+02:00",
          durationMs: 30 * 60 * 1000,
          date: "2026-04-07",
        },
        {
          taskId: "task-2",
          subjectId: "subject-1",
          chapterId: "subject-1-1",
          subjectTitle: "Matière subject-1",
          chapterTitle: "Chapitre subject-1-1",
          startedAt: "2026-04-07T09:00:00+02:00",
          completedAt: "2026-04-07T09:20:00+02:00",
          durationMs: 20 * 60 * 1000,
          date: "2026-04-07",
        },
        {
          taskId: "task-3",
          subjectId: "subject-1",
          chapterId: "subject-1-2",
          subjectTitle: "Matière subject-1",
          chapterTitle: "Chapitre subject-1-2",
          startedAt: "2026-04-08T10:00:00+02:00",
          completedAt: "2026-04-08T10:50:00+02:00",
          durationMs: 50 * 60 * 1000,
          date: "2026-04-08",
        },
      ],
    });

    expect(snapshot.weeklyChaptersDone).toBe(2);
    expect(snapshot.totalLoggedHours).toBe(1.7);
  });

  it("assigns a late Sunday entry to Sunday when the stored date was shifted", () => {
    const snapshot = calculateWeeklyTrackerSnapshot({
      currentDate: new Date("2026-04-05T12:00:00+02:00"),
      now: new Date("2026-04-05T12:00:00+02:00"),
      strategy: null,
      subjects: [],
      timings: [
        {
          taskId: "task-1",
          subjectId: "subject-1",
          chapterId: "chapter-1",
          subjectTitle: "Cardio",
          chapterTitle: "ECG",
          startedAt: "2026-04-05T21:30:00+02:00",
          durationMs: 30 * 60 * 1000,
          date: "2026-04-06",
        },
      ],
    });

    const sunday = snapshot.weekData.find((day) => day.dateStr === "2026-04-05");
    const monday = snapshot.weekData.find((day) => day.dateStr === "2026-03-30");

    expect(sunday?.loggedHours).toBe(0.5);
    expect(monday?.loggedHours).toBe(0);
    expect(snapshot.totalLoggedHours).toBe(0.5);
  });

  it("uses completed chapter progress to estimate pace when there is no deadline", () => {
    const strategy: ActiveStrategy = {
      mode: "rush",
      preparationSubjectIds: [],
      preparationDeadline: null,
      rushSubjectIds: ["subject-1"],
      vacancesObjectif: null,
      vacancesSubjectIds: [],
      vacancesDuree: null,
      vacancesPerimetre: null,
      createdAt: new Date("2026-03-23T12:00:00+02:00").getTime(),
    };

    const snapshot = calculateWeeklyTrackerSnapshot({
      currentDate: new Date("2026-04-06T12:00:00+02:00"),
      now: new Date("2026-04-06T12:00:00+02:00"),
      strategy,
      subjects: [makeSubject("subject-1", 12, 3)],
      timings: [],
    });

    expect(snapshot.weeklyCourseGoal).toBe(2);
  });
});
