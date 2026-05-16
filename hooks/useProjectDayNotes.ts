"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { DayNote } from "@/types/project";

export function useProjectDayNotes(projectId: string | null): DayNote[] {
  const result = useLiveQuery(async () => {
    if (!projectId) return [];
    const rows = await db.dayNotes
      .where("projectId")
      .equals(projectId)
      .toArray();
    return rows
      .filter((n) => n.deletedAt === null)
      .sort((a, b) => (a.dateKey < b.dateKey ? 1 : a.dateKey > b.dateKey ? -1 : 0));
  }, [projectId]);

  return result ?? [];
}
