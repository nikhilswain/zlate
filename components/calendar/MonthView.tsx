"use client";

import {
  addDays,
  endOfMonth,
  endOfWeek,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { useUIStore } from "@/store/useUIStore";
import { useSettings } from "@/hooks/useSettings";
import { DayCell } from "./DayCell";
import type { WeekStartsOn } from "@/types/project";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function weekdayLabels(weekStartsOn: WeekStartsOn): readonly string[] {
  return [...WEEKDAYS.slice(weekStartsOn), ...WEEKDAYS.slice(0, weekStartsOn)];
}

export function MonthView() {
  const currentDate = useUIStore((s) => s.currentDate);
  const { weekStartsOn, renderMode } = useSettings();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn });

  const days: Date[] = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) {
    days.push(d);
  }

  const labels = weekdayLabels(weekStartsOn);

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-7 gap-2">
        {labels.map((label) => (
          <div
            key={label}
            className="text-[11px] uppercase tracking-wider text-fg-subtle text-center py-1"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2 auto-rows-[120px]" data-render-mode={renderMode}>
        {days.map((day) => (
          <DayCell
            key={day.toISOString()}
            day={day}
            isInMonth={isSameMonth(day, currentDate)}
            renderMode={renderMode}
          />
        ))}
      </div>
    </div>
  );
}
