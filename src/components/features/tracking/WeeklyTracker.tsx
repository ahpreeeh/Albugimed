"use client";

import React, { useState, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useStrategy } from "@/context/StrategyContext";
import { useSubjects } from "@/context/SubjectContext";
import { cn } from "@/lib/utils";

type WeekDay = {
  day: string;
  date: number;
  dateStr: string;
  loggedHours: number;
  completedCourses: number;
  isToday?: boolean;
};

// --- Helpers ---
function getWeekRange(date: Date) {
  const day = date.getDay();
  const diffToMonday = date.getDate() - day + (day === 0 ? -6 : 1); 
  const monday = new Date(date);
  monday.setDate(diffToMonday);
  monday.setHours(0,0,0,0);
  
  const dates: Date[] = [];
  for(let i=0; i<7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function isoDateString(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
}

const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

export function WeeklyTracker() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekData, setWeekData] = useState<WeekDay[]>([]);
  const [weeklyCourseGoal, setWeeklyCourseGoal] = useState(0);
  const { strategy } = useStrategy();
  const { subjects } = useSubjects();

  useEffect(() => {
     const updateData = () => {
         const todayStr = isoDateString(new Date());
         const weekDates = getWeekRange(currentDate);

         let timings: any[] = [];
         try {
           timings = JSON.parse(localStorage.getItem('med-pilot-session-timing') || '[]');
         } catch { /* empty */ }

         const newWeekData = weekDates.map(d => {
             const dateStr = isoDateString(d);
             const dayTimings = timings.filter((t: any) => t.date === dateStr);
             
             const sumMs = dayTimings.reduce((acc: number, t: any) => acc + (t.durationMs || 0), 0);
             const loggedHours = Math.round((sumMs / (1000 * 60 * 60)) * 10) / 10;

             return {
                 day: dayNames[d.getDay()],
                 date: d.getDate(),
                 dateStr,
                 loggedHours,
                 completedCourses: dayTimings.length,
                 isToday: dateStr === todayStr
             };
         });
         
         setWeekData(prev => JSON.stringify(prev) === JSON.stringify(newWeekData) ? prev : newWeekData);

         // --- Calculate dynamically the goal ---
         if (strategy?.mode === 'preparation' && strategy.preparationDeadline) {
             const targetSubjects = subjects.filter(s => strategy.preparationSubjectIds?.includes(s.id));
             const totalChapters = targetSubjects.reduce((sum, s) => sum + s.chapters.length, 0);

             if (totalChapters > 0) {
                 const deadline = new Date(strategy.preparationDeadline);
                 const now = new Date();
                 const msDiff = deadline.getTime() - now.getTime();
                 const totalTimingsCount = timings.length;
                 const pendingChapters = Math.max(0, totalChapters - totalTimingsCount);

                 if (msDiff <= 0) {
                     setWeeklyCourseGoal(pendingChapters);
                 } else {
                     const weeksLeft = msDiff / (1000 * 60 * 60 * 24 * 7);
                     if (weeksLeft < 1) {
                         setWeeklyCourseGoal(pendingChapters);
                     } else {
                         setWeeklyCourseGoal(Math.ceil(pendingChapters / weeksLeft));
                     }
                 }
             } else {
                 setWeeklyCourseGoal(0);
             }
         } else {
             setWeeklyCourseGoal(0);
         }
     };

     updateData();
     const interval = setInterval(updateData, 5000); // Auto-refresh to sync with SessionWidget
     return () => clearInterval(interval);
  }, [currentDate, strategy, subjects]);

  const prevWeek = () => {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
  };

  const nextWeek = () => {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
  };

  const labelStart = getWeekRange(currentDate)[0];
  const labelEnd = getWeekRange(currentDate)[6];
  const dateLabel = `${labelStart.getDate()} - ${labelEnd.getDate()} ${monthNames[labelEnd.getMonth()]} ${labelEnd.getFullYear()}`;

  const totalLoggedHours = weekData.reduce((sum, day) => sum + day.loggedHours, 0);
  const weeklyCoursesDone = weekData.reduce((sum, day) => sum + day.completedCourses, 0);
  const maxLoggedHours = Math.max(...weekData.map((day) => day.loggedHours), 0);

  const completionRate =
    weeklyCourseGoal > 0
      ? Math.round((weeklyCoursesDone / weeklyCourseGoal) * 100)
      : 0;

  const getBarWidth = (loggedHours: number) => {
    if (maxLoggedHours === 0) return "0%";
    return `${(loggedHours / maxLoggedHours) * 100}%`;
  };

  const formatHours = (hours: number) => {
    return `${hours}h faites`;
  };

  return (
    <div className="app-card p-3 sm:p-6">
      <div className="flex items-center justify-between mb-3 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[var(--color-accent)] rounded-xl flex items-center justify-center shadow-md shrink-0">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>

          <div>
            <h3 className="text-[var(--color-text-primary)] font-semibold text-sm sm:text-base">Suivi hebdomadaire</h3>
            <p className="text-xs sm:text-sm text-[var(--color-text-muted)] capitalize">{dateLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={prevWeek}
            aria-label="Semaine précédente"
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-active-nav)] transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-[var(--color-text-secondary)]" />
          </button>

          <button
            type="button"
            onClick={nextWeek}
            aria-label="Semaine suivante"
            className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-active-nav)] transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)]" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-3">
        {weekData.map((day) => (
          <div
            key={`${day.day}-${day.date}`}
            className={cn(
              "relative rounded-xl p-1.5 sm:p-4 transition-all cursor-pointer",
              day.isToday
                ? "bg-[var(--color-accent-muted)] border border-[var(--color-accent-soft)]"
                : "bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-active-nav)]"
            )}
          >
            {day.isToday && (
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-[var(--color-accent)] rounded-full border-2 border-[var(--color-bg-surface)]" />
            )}

            <div className={cn("text-[9px] sm:text-xs mb-1 sm:mb-2 font-medium tracking-wide", day.isToday ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]")}>
              {day.day}
            </div>

            <div className={cn("text-base sm:text-2xl mb-1 sm:mb-3 font-semibold", day.isToday ? "text-[var(--color-accent)]" : "text-[var(--color-text-primary)]")}>
              {day.date}
            </div>

            <div className="space-y-1 sm:space-y-2">
              <div className={cn("text-[9px] sm:text-sm font-medium", day.isToday ? "text-[var(--color-accent)]" : "text-[var(--color-text-secondary)]")}>
                <span className="hidden sm:inline">{formatHours(day.loggedHours)}</span>
                <span className="sm:hidden">{day.loggedHours}h</span>
              </div>
            </div>

            <div
              className={cn("mt-2 sm:mt-4 w-full h-1 sm:h-1.5 rounded-full overflow-hidden", day.isToday ? "bg-[var(--color-accent-soft)]" : "bg-[var(--color-border-default)]")}
            >
              <div
                className={cn("h-full rounded-full transition-all duration-300", day.isToday ? "bg-[var(--color-accent)]" : "bg-[var(--color-text-secondary)]")}
                style={{ width: getBarWidth(day.loggedHours) }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div>
          <div className="text-xs sm:text-sm text-[var(--color-text-muted)] mb-1">Total hebdomadaire</div>
          <div className="text-xl sm:text-2xl font-semibold text-[var(--color-text-primary)]">{totalLoggedHours} heures</div>
        </div>

        <div className="flex items-center gap-3 sm:gap-6 flex-wrap">
          <div>
            <div className="text-xs sm:text-sm text-[var(--color-text-muted)]">Objectif chapitres</div>
            <div className="font-semibold text-base sm:text-lg text-[var(--color-text-primary)]">{weeklyCourseGoal}</div>
          </div>

          <div>
            <div className="text-xs sm:text-sm text-[var(--color-text-muted)]">Chapitres terminés</div>
            <div className="font-semibold text-base sm:text-lg text-[var(--color-text-primary)]">{weeklyCoursesDone}</div>
          </div>

          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[var(--color-accent-muted)] border border-[var(--color-accent-soft)] flex items-center justify-center">
            <span className="text-base sm:text-xl font-bold text-[var(--color-accent)]">{completionRate}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
