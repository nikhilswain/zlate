"use client";

import { useMemo } from "react";
import { addDays, endOfYear, format, startOfWeek, startOfYear } from "date-fns";
import { useUIStore } from "@/store/useUIStore";
import { useSettings } from "@/hooks/useSettings";
import { useProjects } from "@/hooks/useProjects";
import { updateSettings } from "@/lib/settings";
import { dominantProjectOnDay, isPastDay } from "@/lib/dateRange";

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

export function YearHeatmap() {
  const currentDate = useUIStore((s) => s.currentDate);
  const setCurrentDate = useUIStore((s) => s.setCurrentDate);
  const { weekStartsOn } = useSettings();
  const projects = useProjects();

  const { weeks, monthMarkers } = useMemo(() => {
    const year = currentDate.getFullYear();
    const yearStart = startOfYear(new Date(year, 0, 1));
    const yearEnd = endOfYear(new Date(year, 0, 1));
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
      const firstInYear = week.find((d) => d.getFullYear() === year);
      if (!firstInYear) return;
      const m = firstInYear.getMonth();
      if (m !== lastMonth) {
        markers.push({ col: idx, label: MONTH_LABELS[m] });
        lastMonth = m;
      }
    });

    return { weeks: weeksOut, monthMarkers: markers };
  }, [currentDate, weekStartsOn]);

  const year = currentDate.getFullYear();

  return (
    <div className="flex flex-col gap-2">
      <div
        className="grid gap-1 pl-7 text-[10px] uppercase tracking-wider text-fg-subtle"
        style={{ gridTemplateColumns: `repeat(${weeks.length}, 14px)` }}
      >
        {Array.from({ length: weeks.length }, (_, i) => {
          const marker = monthMarkers.find((m) => m.col === i);
          return (
            <div key={i} className="h-3">
              {marker?.label}
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        <div className="flex flex-col gap-1 text-[10px] text-fg-subtle pt-0.5">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="h-3 flex items-center">
              {i % 2 === 1 ? format(addDays(weeks[0][0], i), "EEEEE") : ""}
            </div>
          ))}
        </div>
        <div className="flex gap-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((day) => {
                const inYear = day.getFullYear() === year;
                const dominant = inYear
                  ? dominantProjectOnDay(projects, day)
                  : null;
                const past = isPastDay(day);
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => {
                      if (!inYear) return;
                      setCurrentDate(day);
                      void updateSettings({ view: "month" });
                    }}
                    title={
                      dominant
                        ? `${format(day, "MMM d")} — ${dominant.name}`
                        : format(day, "MMM d")
                    }
                    aria-label={
                      dominant
                        ? `${format(day, "MMM d")}, ${dominant.name}`
                        : format(day, "MMM d")
                    }
                    className="size-3 rounded-sm transition-transform hover:scale-110"
                    style={{
                      background: dominant
                        ? dominant.baseColor
                        : "var(--border-subtle)",
                      opacity: !inYear
                        ? 0.3
                        : dominant && past
                          ? 0.6
                          : 1,
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
