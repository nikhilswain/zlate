"use client";

import { Fragment, useMemo, useState } from "react";
import {
  addDays,
  endOfYear,
  format,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { useUIStore } from "@/store/useUIStore";
import { useSettings } from "@/hooks/useSettings";
import { useProjects } from "@/hooks/useProjects";
import { updateSettings } from "@/lib/settings";
import { isPastDay, projectActiveOnDay } from "@/lib/dateRange";
import type { Project } from "@/types/project";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const CELL_SIZE = 20;
const MAX_BANDS = 3;
const STAGGER_PER_WEEK = 0.012;
const TOOLTIP_GAP = 10;
const ESTIMATED_TOOLTIP_HEIGHT = 90;

type HoverState = {
  day: Date;
  projects: Project[];
  rect: DOMRect;
};

export function YearHeatmap() {
  const currentDate = useUIStore((s) => s.currentDate);
  const setCurrentDate = useUIStore((s) => s.setCurrentDate);
  const focusedProjectIds = useUIStore((s) => s.focusedProjectIds);
  const { weekStartsOn } = useSettings();
  const projects = useProjects();
  const [hover, setHover] = useState<HoverState | null>(null);

  const { weeks, monthMarkers, year } = useMemo(() => {
    const y = currentDate.getFullYear();
    const yearStart = startOfYear(new Date(y, 0, 1));
    const yearEnd = endOfYear(new Date(y, 0, 1));
    const gridStart = startOfWeek(yearStart, { weekStartsOn });

    const weeksOut: Date[][] = [];
    let cursor = gridStart;
    while (cursor <= yearEnd) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) week.push(addDays(cursor, i));
      weeksOut.push(week);
      cursor = addDays(cursor, 7);
    }

    const markers: { col: number; label: string }[] = [];
    let lastMonth = -1;
    weeksOut.forEach((week, idx) => {
      const firstInYear = week.find((d) => d.getFullYear() === y);
      if (!firstInYear) return;
      const m = firstInYear.getMonth();
      if (m !== lastMonth) {
        markers.push({ col: idx, label: MONTH_LABELS[m] });
        lastMonth = m;
      }
    });

    return { weeks: weeksOut, monthMarkers: markers, year: y };
  }, [currentDate, weekStartsOn]);

  function projectsOn(day: Date): Project[] {
    const active = projects.filter((p) => projectActiveOnDay(p, day));
    if (focusedProjectIds.size === 0) return active;
    return active.filter((p) => focusedProjectIds.has(p.id));
  }

  const dayLabelFor = (rowIdx: number) =>
    rowIdx % 2 === 1 ? format(addDays(weeks[0][0], rowIdx), "EEEEEE") : "";

  return (
    <div className="relative w-fit">
      <div
        className="grid gap-y-1"
        style={{
          gridTemplateColumns: `28px repeat(${weeks.length}, ${CELL_SIZE}px)`,
          columnGap: 4,
        }}
      >
        <div />
        {weeks.map((_, i) => {
          const marker = monthMarkers.find((m) => m.col === i);
          return (
            <div
              key={`m-${i}`}
              className="text-[10px] uppercase tracking-wider text-fg-subtle h-4 leading-none"
            >
              {marker?.label}
            </div>
          );
        })}

        {Array.from({ length: 7 }, (_, rowIdx) => (
          <Fragment key={`row-${rowIdx}`}>
            <div className="text-[10px] text-fg-subtle pr-2 flex items-center justify-end leading-none">
              {dayLabelFor(rowIdx)}
            </div>
            {weeks.map((week, weekIdx) => {
              const day = week[rowIdx];
              const inYear = day.getFullYear() === year;
              const dayProjects = inYear ? projectsOn(day) : [];
              const hasProjects = dayProjects.length > 0;
              const past = isPastDay(day);
              const finalOpacity = !inYear
                ? 0.18
                : hasProjects
                  ? past
                    ? 0.6
                    : 1
                  : 0.45;
              const visible = dayProjects.slice(0, MAX_BANDS);
              const ariaLabel = `${format(day, "MMM d")}${
                dayProjects.length > 0
                  ? ", " + dayProjects.map((p) => p.name).join(", ")
                  : ""
              }`;
              return (
                <motion.button
                  key={day.toISOString()}
                  type="button"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: finalOpacity, scale: 1 }}
                  transition={{
                    delay: weekIdx * STAGGER_PER_WEEK,
                    duration: 0.32,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  onMouseEnter={(e) =>
                    setHover({
                      day,
                      projects: dayProjects,
                      rect: e.currentTarget.getBoundingClientRect(),
                    })
                  }
                  onMouseLeave={() => setHover(null)}
                  onFocus={(e) =>
                    setHover({
                      day,
                      projects: dayProjects,
                      rect: e.currentTarget.getBoundingClientRect(),
                    })
                  }
                  onBlur={() => setHover(null)}
                  onClick={() => {
                    if (!inYear) return;
                    setCurrentDate(day);
                    void updateSettings({ view: "month" });
                  }}
                  aria-label={ariaLabel}
                  className="rounded-[3px] overflow-hidden flex flex-col hover:ring-2 hover:ring-fg/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  style={{ width: CELL_SIZE, height: CELL_SIZE }}
                >
                  {hasProjects ? (
                    visible.map((p) => (
                      <div
                        key={p.id}
                        className="flex-1 min-h-0"
                        style={{ background: p.baseColor }}
                      />
                    ))
                  ) : (
                    <div
                      className="flex-1"
                      style={{ background: "var(--border-subtle)" }}
                    />
                  )}
                </motion.button>
              );
            })}
          </Fragment>
        ))}
      </div>

      <AnimatePresence>
        {hover && (
          <Tooltip
            key={hover.day.toISOString()}
            day={hover.day}
            projects={hover.projects}
            rect={hover.rect}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function Tooltip({
  day,
  projects,
  rect,
}: {
  day: Date;
  projects: Project[];
  rect: DOMRect;
}) {
  const placeAbove = rect.top > ESTIMATED_TOOLTIP_HEIGHT + TOOLTIP_GAP;

  const positionStyle: React.CSSProperties = placeAbove
    ? {
        top: rect.top - TOOLTIP_GAP,
        left: rect.left + rect.width / 2,
        transform: "translate(-50%, -100%)",
      }
    : {
        top: rect.bottom + TOOLTIP_GAP,
        left: rect.left + rect.width / 2,
        transform: "translateX(-50%)",
      };

  return (
    <div className="fixed z-50 pointer-events-none" style={positionStyle}>
      <motion.div
        initial={{ opacity: 0, y: placeAbove ? 4 : -4, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: placeAbove ? 4 : -4, scale: 0.96 }}
        transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
        className="relative"
      >
        <div className="px-3 py-2 bg-surface-elevated border border-border rounded-md shadow-2xl whitespace-nowrap flex flex-col gap-1.5">
          <div className="text-[10px] text-fg-subtle uppercase tracking-wider leading-none">
            {format(day, "EEE, MMM d")}
          </div>
          {projects.length === 0 ? (
            <div className="text-[11px] text-fg-muted leading-tight">
              No project
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 leading-none"
                >
                  <span
                    aria-hidden
                    className="size-2 rounded-full shrink-0"
                    style={{ background: p.baseColor }}
                  />
                  <span className="text-[11px] font-medium text-fg">
                    {p.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div
          aria-hidden
          className={
            "absolute left-1/2 -translate-x-1/2 size-2 rotate-45 bg-surface-elevated " +
            (placeAbove
              ? "-bottom-1 border-r border-b border-border"
              : "-top-1 border-t border-l border-border")
          }
        />
      </motion.div>
    </div>
  );
}
