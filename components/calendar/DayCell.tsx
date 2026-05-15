"use client";

import { useRef } from "react";
import { format, isToday } from "date-fns";
import { useProjectsOnDay } from "@/hooks/useProjectsOnDay";
import { useUIStore } from "@/store/useUIStore";
import { isPastDay } from "@/lib/dateRange";
import { readableTextColor } from "@/lib/contrast";
import { MultiProjectFill } from "./MultiProjectFill";
import { PaintedFill } from "./PaintedFill";
import type { RenderMode } from "@/types/project";

type Props = {
  day: Date;
  isInMonth: boolean;
  renderMode: RenderMode;
};

export function DayCell({ day, isInMonth, renderMode }: Props) {
  const projects = useProjectsOnDay(day);
  const openCreatePopover = useUIStore((s) => s.openCreatePopover);
  const today = isToday(day);
  const past = isPastDay(day);
  const cellRef = useRef<HTMLDivElement>(null);

  const isPaintedFilled = renderMode === "painted" && projects.length > 0;

  function triggerCreate() {
    const el = cellRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    openCreatePopover(day, {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
  }

  const wrapperClass = [
    "relative rounded-md bg-surface border overflow-hidden",
    today
      ? "border-transparent outline outline-[1.5px] outline-ring outline-offset-2"
      : "border-border-subtle",
    !isInMonth ? "opacity-40" : "",
    isPaintedFilled
      ? ""
      : "p-2 flex flex-col cursor-pointer hover:bg-surface-elevated transition-colors",
  ].join(" ");

  if (isPaintedFilled) {
    const dateColor = readableTextColor(projects[0].baseColor);
    return (
      <div ref={cellRef} className={wrapperClass}>
        <PaintedFill projects={projects} isPast={past} day={day} />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            triggerCreate();
          }}
          aria-label={`Create project on ${format(day, "MMM d")}`}
          className="absolute top-1.5 left-1.5 z-10 text-[11px] leading-none font-medium px-1 py-0.5 rounded hover:bg-black/10 transition-colors"
          style={{ color: dateColor }}
        >
          {format(day, "d")}
        </button>
      </div>
    );
  }

  return (
    <div ref={cellRef} onClick={triggerCreate} className={wrapperClass}>
      <div
        className={
          "text-[11px] leading-none font-medium " +
          (today ? "text-fg" : "text-fg-muted")
        }
      >
        {format(day, "d")}
      </div>
      <MultiProjectFill projects={projects} isPast={past} day={day} />
    </div>
  );
}
