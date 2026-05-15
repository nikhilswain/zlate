"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { Project } from "@/types/project";

export function useProjects(): Project[] {
  const projects = useLiveQuery(async () => {
    const all = await db.projects.toArray();
    return all
      .filter((p) => p.deletedAt === null)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  });
  return projects ?? [];
}
