import { isBefore, startOfDay } from "date-fns";
import type { Project } from "@/types/project";

export function isPastDay(day: Date, now: Date = new Date()): boolean {
  return isBefore(startOfDay(day), startOfDay(now));
}

export function projectActiveOnDay(project: Project, day: Date): boolean {
  const d = startOfDay(day).getTime();
  return (
    startOfDay(project.startDate).getTime() <= d &&
    d <= startOfDay(project.endDate).getTime()
  );
}

export function dominantProjectOnDay(
  projects: Project[],
  day: Date,
): Project | null {
  const active = projects.filter((p) => projectActiveOnDay(p, day));
  if (active.length === 0) return null;
  return active.reduce((best, p) => {
    const bestSpan = best.endDate.getTime() - best.startDate.getTime();
    const pSpan = p.endDate.getTime() - p.startDate.getTime();
    if (pSpan > bestSpan) return p;
    if (
      pSpan === bestSpan &&
      p.createdAt.getTime() < best.createdAt.getTime()
    ) {
      return p;
    }
    return best;
  });
}
