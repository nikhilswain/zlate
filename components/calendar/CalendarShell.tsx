"use client";

import { useMemo } from "react";
import {
  addDays,
  addMonths,
  addYears,
  format,
  startOfWeek,
  subDays,
  subMonths,
  subYears,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  LayoutList,
  Rows3,
} from "lucide-react";
import { useUIStore } from "@/store/useUIStore";
import { useSettings } from "@/hooks/useSettings";
import { updateSettings } from "@/lib/settings";
import { MonthView } from "./MonthView";
import { WeekView } from "./WeekView";
import { YearHeatmap } from "./YearHeatmap";
import type { CalendarView } from "@/types/project";

const VIEW_OPTIONS: { id: CalendarView; label: string }[] = [
  { id: "month", label: "Month" },
  { id: "week", label: "Week" },
  { id: "year", label: "Year" },
];

export function CalendarShell() {
  const currentDate = useUIStore((s) => s.currentDate);
  const setCurrentDate = useUIStore((s) => s.setCurrentDate);
  const { view, renderMode, weekStartsOn } = useSettings();

  const heading = useMemo(() => {
    if (view === "month") return format(currentDate, "MMMM yyyy");
    if (view === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn });
      const end = addDays(start, 6);
      const sameMonth = start.getMonth() === end.getMonth();
      return sameMonth
        ? `${format(start, "MMM d")} – ${format(end, "d, yyyy")}`
        : `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
    }
    return format(currentDate, "yyyy");
  }, [view, currentDate, weekStartsOn]);

  function nav(direction: -1 | 1) {
    if (view === "month") {
      setCurrentDate(
        direction === -1
          ? subMonths(currentDate, 1)
          : addMonths(currentDate, 1),
      );
    } else if (view === "week") {
      setCurrentDate(
        direction === -1 ? subDays(currentDate, 7) : addDays(currentDate, 7),
      );
    } else {
      setCurrentDate(
        direction === -1
          ? subYears(currentDate, 1)
          : addYears(currentDate, 1),
      );
    }
  }

  function toggleRenderMode() {
    void updateSettings({
      renderMode: renderMode === "pills" ? "painted" : "pills",
    });
  }

  return (
    <div className="flex flex-1 flex-col min-w-0">
      <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border-subtle">
        <h2 className="text-lg font-medium text-fg whitespace-nowrap">
          {heading}
        </h2>
        <div className="flex items-center gap-2">
          <ViewSwitcher current={view} />
          {view !== "year" && (
            <IconButton
              label={
                renderMode === "pills"
                  ? "Switch to painted mode"
                  : "Switch to pills mode"
              }
              onClick={toggleRenderMode}
            >
              {renderMode === "pills" ? (
                <Rows3 size={15} />
              ) : (
                <LayoutList size={15} />
              )}
            </IconButton>
          )}
          <div className="w-px h-5 bg-border-subtle mx-1" />
          <IconButton label="Previous" onClick={() => nav(-1)}>
            <ChevronLeft size={16} />
          </IconButton>
          <button
            type="button"
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 text-xs font-medium text-fg-muted hover:text-fg rounded-full transition-colors"
          >
            Today
          </button>
          <IconButton label="Next" onClick={() => nav(1)}>
            <ChevronRight size={16} />
          </IconButton>
        </div>
      </header>
      <div className="flex-1 overflow-auto p-4">
        {view === "month" && <MonthView />}
        {view === "week" && <WeekView />}
        {view === "year" && <YearHeatmap />}
      </div>
    </div>
  );
}

function ViewSwitcher({ current }: { current: CalendarView }) {
  return (
    <div className="flex items-center gap-0.5 bg-bg rounded-full p-0.5">
      {VIEW_OPTIONS.map((opt) => {
        const active = current === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => void updateSettings({ view: opt.id })}
            className={
              "px-2.5 py-1 text-xs rounded-full transition-colors " +
              (active
                ? "bg-surface-elevated text-fg"
                : "text-fg-muted hover:text-fg")
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-fg-muted hover:bg-surface hover:text-fg transition-colors"
    >
      {children}
    </button>
  );
}
