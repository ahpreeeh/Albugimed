import type { Subject } from "@/context/SubjectContext";
import type { SessionTimingEntry } from "@/entities/session-timing/model";
import {
  getSessionTimingChapterKey,
  mergeSessionTimingEntries,
} from "@/entities/session-timing/model";
import { toLocalISOString } from "@/shared/lib/cn";
import type { ActiveStrategy } from "@/types/strategy";

export type WeeklyTrackerDay = {
  day: string;
  date: number;
  dateStr: string;
  loggedHours: number;
  workedChapters: number;
  isToday: boolean;
};

export interface WeeklyTrackerSnapshot {
  weekData: WeeklyTrackerDay[];
  weeklyCourseGoal: number;
  weeklyChaptersDone: number;
  totalLoggedHours: number;
  completionRate: number;
}

const DAY_MS = 1000 * 60 * 60 * 24;
const WEEK_MS = DAY_MS * 7;
const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
export const monthNames = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function parseDateOnlyAsLocalEndOfDay(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), 23, 59, 59, 999);
}

function getTargetSubjectIds(strategy: ActiveStrategy | null): string[] {
  if (!strategy) {
    return [];
  }

  switch (strategy.mode) {
    case "preparation":
      return strategy.preparationSubjectIds ?? [];
    case "rush":
      return strategy.rushSubjectIds ?? [];
    case "vacances":
      return strategy.vacancesSubjectIds ?? [];
    default:
      return [];
  }
}

function getStrategyDeadline(strategy: ActiveStrategy | null): Date | null {
  if (!strategy) {
    return null;
  }

  if (strategy.mode === "preparation" && strategy.preparationDeadline) {
    return parseDateOnlyAsLocalEndOfDay(strategy.preparationDeadline);
  }

  if (strategy.mode === "vacances" && strategy.vacancesDuree) {
    const durationMap: Record<string, number> = {
      "1w": 7,
      "2w": 14,
      "3w": 21,
      "1m": 30,
      "6w": 42,
      "2m": 60,
      "3m": 90,
    };
    const durationDays = durationMap[strategy.vacancesDuree] ?? 0;

    if (durationDays > 0) {
      return new Date(strategy.createdAt + durationDays * DAY_MS);
    }
  }

  return null;
}

export function getWeekRange(date: Date): Date[] {
  const day = date.getDay();
  const diffToMonday = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date);
  monday.setDate(diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const dates: Date[] = [];
  for (let index = 0; index < 7; index += 1) {
    const next = new Date(monday);
    next.setDate(monday.getDate() + index);
    dates.push(next);
  }

  return dates;
}

export function getWeekDateLabel(date: Date): string {
  const [labelStart, , , , , , labelEnd] = getWeekRange(date);
  return `${labelStart.getDate()} - ${labelEnd.getDate()} ${monthNames[labelEnd.getMonth()]} ${labelEnd.getFullYear()}`;
}

export function isChapterCompleted(subject: Subject, chapterId: string): boolean {
  const chapter = subject.chapters.find((item) => item.id === chapterId);
  if (!chapter) {
    return false;
  }

  return (
    chapter.progress.level1Done ||
    chapter.progress.reactivationDone ||
    chapter.progress.advancedDone
  );
}

function countCompletedTargetChapters(subjects: Subject[]): number {
  return subjects.reduce((sum, subject) => {
    return (
      sum +
      subject.chapters.filter(
        (chapter) =>
          chapter.progress.level1Done ||
          chapter.progress.reactivationDone ||
          chapter.progress.advancedDone,
      ).length
    );
  }, 0);
}

function countUniqueWorkedChapters(entries: SessionTimingEntry[]): number {
  return new Set(
    entries
      .map((entry) => getSessionTimingChapterKey(entry))
      .filter((key): key is string => Boolean(key)),
  ).size;
}

function calculateWeeklyGoal(
  strategy: ActiveStrategy | null,
  subjects: Subject[],
  now: Date,
): number {
  const totalChapters = subjects.reduce((sum, subject) => sum + subject.chapters.length, 0);
  if (!strategy || totalChapters === 0) {
    return 0;
  }

  const completedChapters = countCompletedTargetChapters(subjects);
  const remainingChapters = Math.max(0, totalChapters - completedChapters);
  if (remainingChapters === 0) {
    return 0;
  }

  const deadline = getStrategyDeadline(strategy);
  if (deadline) {
    const daysLeft = Math.ceil(
      (deadline.getTime() - startOfDay(now).getTime()) / DAY_MS,
    );

    if (daysLeft <= 0) {
      return remainingChapters;
    }

    const dailyGoal = Math.ceil(remainingChapters / daysLeft);
    return Math.min(remainingChapters, dailyGoal * 7);
  }

  const elapsedWeeks = strategy.createdAt
    ? Math.max((now.getTime() - strategy.createdAt) / WEEK_MS, 1)
    : 1;
  const weeklyPace =
    completedChapters > 0
      ? Math.ceil(completedChapters / elapsedWeeks)
      : Math.ceil(totalChapters / 4);

  return Math.max(1, Math.min(remainingChapters, weeklyPace));
}

export function calculateWeeklyTrackerSnapshot({
  currentDate,
  now = new Date(),
  strategy,
  subjects,
  timings,
}: {
  currentDate: Date;
  now?: Date;
  strategy: ActiveStrategy | null;
  subjects: Subject[];
  timings: SessionTimingEntry[];
}): WeeklyTrackerSnapshot {
  const normalizedTimings = mergeSessionTimingEntries(timings);
  const todayStr = toLocalISOString(now);
  const weekDates = getWeekRange(currentDate);
  const weekDateSet = new Set(weekDates.map((date) => toLocalISOString(date)));

  const weekData = weekDates.map((date) => {
    const dateStr = toLocalISOString(date);
    const dayTimings = normalizedTimings.filter((entry) => entry.date === dateStr);
    const totalMs = dayTimings.reduce(
      (sum, entry) => sum + Math.max(0, entry.durationMs ?? 0),
      0,
    );

    return {
      day: dayNames[date.getDay()],
      date: date.getDate(),
      dateStr,
      loggedHours: Math.round((totalMs / (1000 * 60 * 60)) * 10) / 10,
      workedChapters: countUniqueWorkedChapters(dayTimings),
      isToday: dateStr === todayStr,
    };
  });

  const weeklyTimings = normalizedTimings.filter(
    (entry) => entry.date && weekDateSet.has(entry.date),
  );
  const weeklyChaptersDone = countUniqueWorkedChapters(weeklyTimings);
  const totalLoggedHours =
    Math.round(
      (weeklyTimings.reduce(
        (sum, entry) => sum + Math.max(0, entry.durationMs ?? 0),
        0,
      ) /
        (1000 * 60 * 60)) *
        10,
    ) / 10;

  const targetSubjectIds = new Set(getTargetSubjectIds(strategy));
  const targetSubjects = subjects.filter((subject) => targetSubjectIds.has(subject.id));
  const weeklyCourseGoal = calculateWeeklyGoal(strategy, targetSubjects, now);
  const completionRate =
    weeklyCourseGoal > 0
      ? Math.round((weeklyChaptersDone / weeklyCourseGoal) * 100)
      : 0;

  return {
    weekData,
    weeklyCourseGoal,
    weeklyChaptersDone,
    totalLoggedHours,
    completionRate,
  };
}
