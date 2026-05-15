"use client";

import { useProjects } from "./useProjects";
import { useUIStore } from "@/store/useUIStore";
import { projectActiveOnDay } from "@/lib/dateRange";
import type { Project } from "@/types/project";

export function useProjectsOnDay(day: Date): Project[] {
  const projects = useProjects();
  const focused = useUIStore((s) => s.focusedProjectIds);
  const active = projects.filter((p) => projectActiveOnDay(p, day));
  if (focused.size === 0) return active;
  return active.filter((p) => focused.has(p.id));
}
