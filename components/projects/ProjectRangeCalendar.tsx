"use client";

import { DayPicker, type DateRange } from "react-day-picker";
import { useSettings } from "@/hooks/useSettings";
import { readableTextColor } from "@/lib/contrast";

type Props = {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  color: string;
};

export function ProjectRangeCalendar({ value, onChange, color }: Props) {
  const { weekStartsOn } = useSettings();
  const onAccent = readableTextColor(color);
  const cssVars = {
    "--rdp-accent-color": color,
    "--rdp-accent-background-color": `color-mix(in srgb, ${color} 18%, transparent)`,
    "--rdp-range_start-date-background-color": color,
    "--rdp-range_end-date-background-color": color,
    "--rdp-range_start-color": onAccent,
    "--rdp-range_end-color": onAccent,
    "--rdp-range_middle-background-color": `color-mix(in srgb, ${color} 18%, transparent)`,
    "--rdp-range_middle-color": "var(--fg)",
    "--rdp-day-height": "32px",
    "--rdp-day-width": "32px",
    "--rdp-day_button-height": "30px",
    "--rdp-day_button-width": "30px",
    "--rdp-day_button-border-radius": "8px",
    "--rdp-day_button-border": "2px solid transparent",
    "--rdp-today-color": color,
    "--rdp-weekday-opacity": "0.6",
    "--rdp-nav_button-height": "1.75rem",
    "--rdp-nav_button-width": "1.75rem",
    "--rdp-nav-height": "2rem",
    "--rdp-animation_duration": "0.22s",
  } as React.CSSProperties;

  return (
    <div className="rdp-zlate text-fg text-[12px]" style={cssVars}>
      <DayPicker
        mode="range"
        selected={value}
        onSelect={onChange}
        weekStartsOn={weekStartsOn}
        showOutsideDays
        animate
        classNames={{
          months: "flex",
          month: "flex flex-col gap-2",
          month_caption: "flex items-center justify-center h-8",
          caption_label: "text-[12px] font-medium text-fg tracking-tight",
          nav: "absolute top-0 inset-x-0 flex items-center justify-between px-1 pointer-events-none",
          button_previous:
            "inline-flex items-center justify-center rounded-full text-fg-muted hover:bg-surface hover:text-fg transition-colors pointer-events-auto",
          button_next:
            "inline-flex items-center justify-center rounded-full text-fg-muted hover:bg-surface hover:text-fg transition-colors pointer-events-auto",
          weekdays: "grid grid-cols-7",
          weekday: "text-[9.5px] uppercase tracking-wider text-fg-subtle font-medium",
          week: "grid grid-cols-7",
          day: "flex items-center justify-center text-fg",
          day_button:
            "flex items-center justify-center cursor-pointer hover:bg-fg/5 transition-colors disabled:cursor-not-allowed",
          today: "font-semibold",
          outside: "text-fg-subtle opacity-40",
          disabled: "opacity-30 cursor-not-allowed",
        }}
      />
    </div>
  );
}
