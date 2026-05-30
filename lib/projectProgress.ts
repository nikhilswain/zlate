import { differenceInCalendarDays, startOfDay } from "date-fns";

// Derived project-duration stats. Pure functions over day-granularity dates.
// Day counts are INCLUSIVE: a project from Mon to Mon spans 1 day, not 0.

export type ProjectPhase = "upcoming" | "active" | "completed";

export interface ProjectProgress {
  phase: ProjectPhase;
  totalDays: number;
  percent: number; // 0..100 — 0 upcoming, N active, 100 completed
  dayNumber: number; // 1-based day within the range; 0 when upcoming
  remainingDays: number; // days from today until end; 0 on/after the end
  startsInDays: number; // 0 unless upcoming
  endedDaysAgo: number; // 0 unless completed
}

function ordered(start: Date, end: Date): [Date, Date] {
  const s = startOfDay(start);
  const e = startOfDay(end);
  return s <= e ? [s, e] : [e, s];
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? "" : "s"}`;
}

export function getProjectProgress(
  start: Date,
  end: Date,
  today: Date = new Date(),
): ProjectProgress {
  const [s, e] = ordered(start, end);
  const t = startOfDay(today);
  const totalDays = differenceInCalendarDays(e, s) + 1;

  if (t < s) {
    return {
      phase: "upcoming",
      totalDays,
      percent: 0,
      dayNumber: 0,
      remainingDays: totalDays,
      startsInDays: differenceInCalendarDays(s, t),
      endedDaysAgo: 0,
    };
  }

  if (t > e) {
    return {
      phase: "completed",
      totalDays,
      percent: 100,
      dayNumber: totalDays,
      remainingDays: 0,
      startsInDays: 0,
      endedDaysAgo: differenceInCalendarDays(t, e),
    };
  }

  const dayNumber = differenceInCalendarDays(t, s) + 1;
  return {
    phase: "active",
    totalDays,
    percent: clamp(Math.round((dayNumber / totalDays) * 100), 1, 100),
    dayNumber,
    remainingDays: differenceInCalendarDays(e, t),
    startsInDays: 0,
    endedDaysAgo: 0,
  };
}

export function durationDays(start: Date, end: Date): number {
  const [s, e] = ordered(start, end);
  return differenceInCalendarDays(e, s) + 1;
}

export function formatProjectStatus(p: ProjectProgress): string {
  switch (p.phase) {
    case "upcoming":
      return `Starts in ${plural(p.startsInDays, "day")}`;
    case "completed":
      return "Completed";
    case "active":
      return p.remainingDays === 0
        ? `Day ${p.dayNumber} of ${p.totalDays} · last day`
        : `Day ${p.dayNumber} of ${p.totalDays} · ${plural(p.remainingDays, "day")} left`;
  }
}

// e.g. "9 days" | "63 days · ~9 weeks" | "120 days · ~4 months"
export function formatDuration(totalDays: number): string {
  if (totalDays < 14) return plural(totalDays, "day");
  if (totalDays < 70) {
    return `${totalDays} days · ~${Math.round(totalDays / 7)} weeks`;
  }
  return `${totalDays} days · ~${Math.round(totalDays / 30)} months`;
}

// --- Day-level context, relative to a specific clicked day ---

export type DayContext =
  | { kind: "before"; days: number }
  | { kind: "within"; dayNumber: number; totalDays: number; remaining: number }
  | { kind: "after"; days: number };

export function getDayContext(start: Date, end: Date, day: Date): DayContext {
  const [s, e] = ordered(start, end);
  const d = startOfDay(day);
  const totalDays = differenceInCalendarDays(e, s) + 1;

  if (d < s) return { kind: "before", days: differenceInCalendarDays(s, d) };
  if (d > e) return { kind: "after", days: differenceInCalendarDays(d, e) };
  return {
    kind: "within",
    dayNumber: differenceInCalendarDays(d, s) + 1,
    totalDays,
    remaining: differenceInCalendarDays(e, d),
  };
}

export function formatDayContext(ctx: DayContext): string {
  switch (ctx.kind) {
    case "before":
      return `${plural(ctx.days, "day")} before start`;
    case "after":
      return `${plural(ctx.days, "day")} after end`;
    case "within":
      return ctx.remaining === 0
        ? `Day ${ctx.dayNumber} of ${ctx.totalDays} · last day`
        : `Day ${ctx.dayNumber} of ${ctx.totalDays} · ${ctx.remaining} left`;
  }
}
