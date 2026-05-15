import Dexie, { type Table } from "dexie";
import type { Project, Settings } from "@/types/project";

export class ZlateDB extends Dexie {
  projects!: Table<Project, string>;
  settings!: Table<Settings, string>;

  constructor() {
    super("zlate");
    this.version(1).stores({
      projects: "id, startDate, endDate, createdAt, deletedAt",
      settings: "id",
    });
  }
}

export const db = new ZlateDB();
