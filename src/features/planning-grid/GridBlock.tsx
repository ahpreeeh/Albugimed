"use client";

// ─── GridBlock ───────────────────────────────────────────────────────
// Bloc d'événement positionné dans la grille hebdomadaire (week view).
// Extrait de PlanningView.tsx (Phase 5 step 5.4).
//
// Pure UI : reçoit un GridItem (déjà calculé par layoutOverlaps) et
// gère le drag-and-drop via callbacks props. Pas de logique métier ni
// d'accès store.

import React from 'react';
import { BookOpen, CalendarDays } from 'lucide-react';
import type { GridItem, PlanningEventType } from '@/entities/planning/types';
import { cn } from '@/shared/lib/cn';
import { TYPE_COLORS } from './styles';

interface GridBlockProps {
    item: GridItem;
    onClick: (item: GridItem) => void;
    onDragStart: (e: React.DragEvent, item: GridItem) => void;
}

export const GridBlock: React.FC<GridBlockProps> = ({ item, onClick, onDragStart }) => {
    const isPlan = item.source === 'plan';
    const isTask = item.type === 'task';
    const minHeight = item.height < 35;

    // Default colors (event/task fallback)
    let cardClass = isTask
        ? "bg-amber-50 border-amber-200 hover:border-amber-300"
        : "bg-sky-50 border-sky-200 hover:border-sky-300";
    let barClass = isTask ? "bg-amber-400" : "bg-sky-400";
    let textClass = "text-slate-700";
    let subTextClass = isTask ? "text-amber-600/70" : "text-sky-600/70";
    let iconColor = isTask ? "text-amber-500" : "text-sky-500";

    if (isPlan && item.type in TYPE_COLORS) {
        const tColor = TYPE_COLORS[item.type as PlanningEventType];
        cardClass = tColor.card + " hover:brightness-95";
        barClass = tColor.dot;
        textClass = "text-[var(--color-text-primary)]";
        subTextClass = "text-[var(--color-text-muted)]";
        iconColor = "text-[var(--color-text-secondary)]";
    }

    return (
        <div
            draggable
            onDragStart={e => onDragStart(e, item)}
            onClick={e => { e.stopPropagation(); onClick(item); }}
            style={{
                position: 'absolute',
                top: `${item.top}px`,
                height: `${item.height}px`,
                left: `calc(${item.left * 100}% + 1px)`,
                width: `calc(${item.width * 100}% - 2px)`,
            }}
            className={cn(
                "rounded-lg border cursor-pointer transition-all duration-200 overflow-hidden group shadow-[0_2px_4px_rgba(0,0,0,0.02)]",
                "hover:z-20 hover:shadow-md active:cursor-grabbing",
                cardClass
            )}
        >
            <div className={cn("absolute left-0 top-0 bottom-0 w-[4px] rounded-l-lg", barClass)} />

            <div className={cn(
                "pl-2 pr-1 py-0.5 h-full flex flex-col justify-center",
                minHeight && "flex-row items-center gap-1",
            )}>
                {!minHeight ? (
                    <>
                        <span className={cn(
                            "text-[10px] font-bold truncate leading-tight",
                            item.isCompleted ? "text-[var(--color-text-hint)] line-through" : textClass,
                        )}>
                            {item.title}
                        </span>
                        <span className={cn(
                            "text-[9px] font-mono font-medium mt-0.5",
                            subTextClass,
                        )}>
                            {item.startTime} – {item.endTime}
                        </span>
                        {item.isDefault && (
                            <span className="text-[8px] bg-white border border-slate-200/60 text-slate-400 px-1 rounded-sm w-fit mt-0.5 shadow-sm">
                                Défaut
                            </span>
                        )}
                        {item.subjectTitle && (
                            <span className="text-[8px] text-[var(--color-text-muted)] uppercase font-bold tracking-wider truncate mt-0.5">
                                {item.subjectTitle}
                            </span>
                        )}
                    </>
                ) : (
                    <>
                        {isPlan || isTask
                            ? <BookOpen className={cn("w-2.5 h-2.5 shrink-0", iconColor)} />
                            : <CalendarDays className={cn("w-2.5 h-2.5 shrink-0", iconColor)} />
                        }
                        <span className={cn("text-[9px] font-mono font-semibold truncate", subTextClass)}>{item.startTime}</span>
                        <span className={cn("text-[9px] font-bold truncate", textClass)}>{item.title}</span>
                    </>
                )}
            </div>
        </div>
    );
};
