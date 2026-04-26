"use client";

import React, { useMemo, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useSubjects } from "@/entities/subject/hooks";
import { useStrategy } from "@/entities/strategy/hooks";
import { useSessionTimingStorage } from "@/hooks/useSessionTimingStorage";
import { cn } from "@/shared/lib/cn";
import {
  calculateWeeklyTrackerSnapshot,
  getWeekDateLabel,
} from "./weeklyTrackerUtils";

export function WeeklyTracker() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { strategy } = useStrategy();
  const { subjects } = useSubjects();
  const { data: timings } = useSessionTimingStorage();

  const {
    weekData,
    weeklyCourseGoal,
    weeklyChaptersDone,
    totalLoggedHours,
    completionRate,
  } = useMemo(
    () =>
      calculateWeeklyTrackerSnapshot({
        currentDate,
        strategy,
        subjects,
        timings,
      }),
    [currentDate, strategy, subjects, timings],
  );

  const prevWeek = () => {
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() - 7);
    setCurrentDate(nextDate);
  };

  const nextWeek = () => {
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 7);
    setCurrentDate(nextDate);
  };

  const maxLoggedHours = Math.max(...weekData.map((day) => day.loggedHours), 0);
  const dateLabel = getWeekDateLabel(currentDate);

  const getBarWidth = (loggedHours: number) => {
    if (maxLoggedHours === 0) {
      return "0%";
    }

    return `${(loggedHours / maxLoggedHours) * 100}%`;
  };

  const formatHours = (hours: number) => {
    return `${hours}h faites`;
  };

  return (
    <div className="app-card p-3 sm:p-6">
      <div className="mb-3 flex items-center justify-between sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="h-8 w-8 shrink-0 rounded-xl bg-[var(--color-accent)] shadow-md sm:h-10 sm:w-10 flex items-center justify-center">
            <Calendar className="h-4 w-4 text-white sm:h-5 sm:w-5" />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] sm:text-base">
              Suivi hebdomadaire
            </h3>
            <p className="text-xs capitalize text-[var(--color-text-muted)] sm:text-sm">
              {dateLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={prevWeek}
            aria-label="Semaine précédente"
            className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-[var(--color-bg-active-nav)] transition-colors sm:h-8 sm:w-8"
          >
            <ChevronLeft className="h-4 w-4 text-[var(--color-text-secondary)]" />
          </button>

          <button
            type="button"
            onClick={nextWeek}
            aria-label="Semaine suivante"
            className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-[var(--color-bg-active-nav)] transition-colors sm:h-8 sm:w-8"
          >
            <ChevronRight className="h-4 w-4 text-[var(--color-text-secondary)]" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-3">
        {weekData.map((day) => (
          <div
            key={`${day.day}-${day.date}`}
            className={cn(
              "relative cursor-pointer rounded-xl p-1.5 transition-all sm:p-4",
              day.isToday
                ? "border border-[var(--color-accent-soft)] bg-[var(--color-accent-muted)]"
                : "bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-active-nav)]",
            )}
          >
            {day.isToday && (
              <div className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-[var(--color-bg-surface)] bg-[var(--color-accent)] sm:h-3 sm:w-3" />
            )}

            <div
              className={cn(
                "mb-1 text-[9px] font-medium tracking-wide sm:mb-2 sm:text-xs",
                day.isToday
                  ? "text-[var(--color-accent)]"
                  : "text-[var(--color-text-muted)]",
              )}
            >
              {day.day}
            </div>

            <div
              className={cn(
                "mb-1 text-base font-semibold sm:mb-3 sm:text-2xl",
                day.isToday
                  ? "text-[var(--color-accent)]"
                  : "text-[var(--color-text-primary)]",
              )}
            >
              {day.date}
            </div>

            <div className="space-y-1 sm:space-y-2">
              <div
                className={cn(
                  "text-[9px] font-medium sm:text-sm",
                  day.isToday
                    ? "text-[var(--color-accent)]"
                    : "text-[var(--color-text-secondary)]",
                )}
              >
                <span className="hidden sm:inline">{formatHours(day.loggedHours)}</span>
                <span className="sm:hidden">{day.loggedHours}h</span>
              </div>
            </div>

            <div
              className={cn(
                "mt-2 h-1 w-full overflow-hidden rounded-full sm:mt-4 sm:h-1.5",
                day.isToday
                  ? "bg-[var(--color-accent-soft)]"
                  : "bg-[var(--color-border-default)]",
              )}
            >
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  day.isToday
                    ? "bg-[var(--color-accent)]"
                    : "bg-[var(--color-text-secondary)]",
                )}
                style={{ width: getBarWidth(day.loggedHours) }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-[var(--color-border)] pt-4 sm:mt-6 sm:flex-row sm:items-center sm:justify-between sm:gap-0 sm:pt-6">
        <div>
          <div className="mb-1 text-xs text-[var(--color-text-muted)] sm:text-sm">
            Total hebdomadaire
          </div>
          <div className="text-xl font-semibold text-[var(--color-text-primary)] sm:text-2xl">
            {totalLoggedHours} heures
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-6">
          <div>
            <div className="text-xs text-[var(--color-text-muted)] sm:text-sm">
              Objectif chapitres
            </div>
            <div className="text-base font-semibold text-[var(--color-text-primary)] sm:text-lg">
              {weeklyCourseGoal}
            </div>
          </div>

          <div>
            <div className="text-xs text-[var(--color-text-muted)] sm:text-sm">
              Chapitres travaillés
            </div>
            <div className="text-base font-semibold text-[var(--color-text-primary)] sm:text-lg">
              {weeklyChaptersDone}
            </div>
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-accent-soft)] bg-[var(--color-accent-muted)] sm:h-16 sm:w-16">
            <span className="text-base font-bold text-[var(--color-accent)] sm:text-xl">
              {completionRate}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
