import { db } from "./db";
import { DEFAULT_SETTINGS, SETTINGS_ID } from "./settings";
import type { DayNote, Project, Settings } from "@/types/project";

export type MergeCounters = {
  projectsAdded: number;
  projectsUpdated: number;
  projectsSkipped: number;
  notesAdded: number;
  notesUpdated: number;
  notesSkipped: number;
  settingsUpdated: boolean;
};

export function emptyMergeCounters(): MergeCounters {
  return {
    projectsAdded: 0,
    projectsUpdated: 0,
    projectsSkipped: 0,
    notesAdded: 0,
    notesUpdated: 0,
    notesSkipped: 0,
    settingsUpdated: false,
  };
}

/**
 * LWW-merges an incoming batch into Dexie. Caller must wrap this in a
 * transaction over projects + dayNotes + settings.
 */
export async function mergeRowsIntoDexie(input: {
  projects: Project[];
  dayNotes: DayNote[];
  settings: Settings | null;
}): Promise<MergeCounters> {
  const result = emptyMergeCounters();

  for (const incoming of input.projects) {
    const existing = await db.projects.get(incoming.id);
    if (!existing) {
      await db.projects.put(incoming);
      result.projectsAdded += 1;
    } else if (incoming.updatedAt.getTime() > existing.updatedAt.getTime()) {
      await db.projects.put(incoming);
      result.projectsUpdated += 1;
    } else {
      result.projectsSkipped += 1;
    }
  }

  for (const incoming of input.dayNotes) {
    const existing = await db.dayNotes.get(incoming.id);
    if (!existing) {
      await db.dayNotes.put(incoming);
      result.notesAdded += 1;
    } else if (incoming.updatedAt.getTime() > existing.updatedAt.getTime()) {
      await db.dayNotes.put(incoming);
      result.notesUpdated += 1;
    } else {
      result.notesSkipped += 1;
    }
  }

  if (input.settings) {
    const localSettings = await db.settings.get(SETTINGS_ID);
    const baseline = localSettings ?? DEFAULT_SETTINGS;
    if (input.settings.updatedAt.getTime() > baseline.updatedAt.getTime()) {
      await db.settings.put({ ...input.settings, id: SETTINGS_ID });
      result.settingsUpdated = true;
    }
  }

  return result;
}
