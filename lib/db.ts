import Dexie, { type Table } from "dexie";
import type { DayNote, Project, Settings, SyncMeta } from "@/types/project";

export class ZlateDB extends Dexie {
  projects!: Table<Project, string>;
  settings!: Table<Settings, string>;
  dayNotes!: Table<DayNote, string>;
  syncMeta!: Table<SyncMeta, string>;

  constructor() {
    super("zlate");
    this.version(1).stores({
      projects: "id, startDate, endDate, createdAt, deletedAt",
      settings: "id",
    });
    this.version(2).stores({
      projects: "id, startDate, endDate, createdAt, deletedAt",
      settings: "id",
      dayNotes: "id, projectId, dateKey, [projectId+dateKey], updatedAt, deletedAt",
    });
    this.version(3).stores({
      projects: "id, startDate, endDate, createdAt, deletedAt",
      settings: "id",
      dayNotes: "id, projectId, dateKey, [projectId+dateKey], updatedAt, deletedAt",
      syncMeta: "id",
    });
  }
}

export const db = new ZlateDB();
