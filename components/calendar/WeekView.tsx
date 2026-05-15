"use client";

import { addDays, startOfWeek } from "date-fns";
import { useUIStore } from "@/store/useUIStore";
import { useSettings } from "@/hooks/useSettings";
import { DayCell } from "./DayCell";
import type { WeekStartsOn } from "@/types/project";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function weekdayLabels(weekStartsOn: WeekStartsOn): readonly string[] {
  return [...WEEKDAYS.slice(weekStartsOn), ...WEEKDAYS.slice(0, weekStartsOn)];
}

export function WeekView() {
  const currentDate = useUIStore((s) => s.currentDate);
  const { weekStartsOn, renderMode } = useSettings();

  const start = startOfWeek(currentDate, { weekStartsOn });
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

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
      <div className="grid grid-cols-7 gap-2 auto-rows-[420px]">
        {days.map((day) => (
          <DayCell
            key={day.toISOString()}
            day={day}
            isInMonth
            renderMode={renderMode}
          />
        ))}
      </div>
    </div>
  );
}
