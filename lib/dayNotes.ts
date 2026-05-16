import { db } from "./db";
import type { DayNote } from "@/types/project";

export const MAX_DAY_NOTE_CHARS = 280;

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function getDayNote(
  projectId: string,
  dateKey: string,
): Promise<DayNote | undefined> {
  const rows = await db.dayNotes
    .where("[projectId+dateKey]")
    .equals([projectId, dateKey])
    .toArray();
  return rows.find((n) => n.deletedAt === null);
}

export async function upsertDayNote(
  projectId: string,
  dateKey: string,
  text: string,
): Promise<void> {
  const trimmed = text.trim();
  const existing = await getDayNote(projectId, dateKey);
  const now = new Date();

  if (!existing) {
    if (!trimmed) return;
    const note: DayNote = {
      id: crypto.randomUUID(),
      projectId,
      dateKey,
      text: trimmed,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    await db.dayNotes.add(note);
    return;
  }

  if (!trimmed) {
    await db.dayNotes.put({
      ...existing,
      text: "",
      deletedAt: now,
      updatedAt: now,
    });
    return;
  }

  if (existing.text === trimmed) return;
  await db.dayNotes.put({
    ...existing,
    text: trimmed,
    updatedAt: now,
  });
}

export async function softDeleteDayNote(id: string): Promise<void> {
  const existing = await db.dayNotes.get(id);
  if (!existing || existing.deletedAt !== null) return;
  await db.dayNotes.put({
    ...existing,
    deletedAt: new Date(),
    updatedAt: new Date(),
  });
}

export async function softDeleteDayNotesForProject(
  projectId: string,
): Promise<void> {
  const rows = await db.dayNotes
    .where("projectId")
    .equals(projectId)
    .toArray();
  const now = new Date();
  await Promise.all(
    rows
      .filter((n) => n.deletedAt === null)
      .map((n) =>
        db.dayNotes.put({ ...n, deletedAt: now, updatedAt: now }),
      ),
  );
}
