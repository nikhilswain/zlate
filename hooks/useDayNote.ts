"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { DayNote } from "@/types/project";

export function useDayNote(
  projectId: string | null,
  dateKey: string | null,
): DayNote | null | undefined {
  const result = useLiveQuery(async () => {
    if (!projectId || !dateKey) return null;
    const rows = await db.dayNotes
      .where("[projectId+dateKey]")
      .equals([projectId, dateKey])
      .toArray();
    return rows.find((n) => n.deletedAt === null) ?? null;
  }, [projectId, dateKey]);

  return result;
}
