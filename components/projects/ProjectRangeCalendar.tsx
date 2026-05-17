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

  const vars = {
    "--zl-accent": color,
    "--zl-accent-soft": `color-mix(in srgb, ${color} 20%, transparent)`,
    "--zl-accent-text": onAccent,
  } as React.CSSProperties;

  return (
    <div className="rdp-zlate" style={vars}>
      <DayPicker
        mode="range"
        selected={value}
        onSelect={onChange}
        weekStartsOn={weekStartsOn}
        showOutsideDays
        animate
      />
    </div>
  );
}
