import { db } from "./db";
import { DEFAULT_SETTINGS, SETTINGS_ID } from "./settings";
import type { DayNote, Project, Settings } from "@/types/project";

export const EXPORT_SCHEMA_VERSION = 2;

export type ExportFile = {
  schemaVersion: number;
  exportedAt: string;
  app: "zlate";
  appVersion: string;
  projects: Project[];
  dayNotes: DayNote[];
  settings: Settings;
};

export type ImportResult = {
  projectsAdded: number;
  projectsUpdated: number;
  projectsSkipped: number;
  notesAdded: number;
  notesUpdated: number;
  notesSkipped: number;
  settingsUpdated: boolean;
};

export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportError";
  }
}

export async function buildExport(appVersion: string): Promise<ExportFile> {
  const [projects, dayNotes, settings] = await Promise.all([
    db.projects.toArray(),
    db.dayNotes.toArray(),
    db.settings.get(SETTINGS_ID),
  ]);
  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    app: "zlate",
    appVersion,
    projects,
    dayNotes,
    settings: settings ?? { ...DEFAULT_SETTINGS, updatedAt: new Date() },
  };
}

function reviveDates<T extends Record<string, unknown>>(
  row: T,
  dateKeys: readonly (keyof T)[],
): T {
  const out = { ...row };
  for (const k of dateKeys) {
    const v = out[k];
    if (typeof v === "string") {
      out[k] = new Date(v) as T[keyof T];
    } else if (v === null) {
      // soft-delete tombstone for deletedAt — leave null
    }
  }
  return out;
}

function parseExport(raw: unknown): ExportFile {
  if (!raw || typeof raw !== "object") {
    throw new ImportError("File is not a valid Zlate backup.");
  }
  const obj = raw as Record<string, unknown>;
  if (obj.app !== "zlate") {
    throw new ImportError("File is not a Zlate backup.");
  }
  if (obj.schemaVersion !== EXPORT_SCHEMA_VERSION) {
    throw new ImportError(
      `Unsupported backup version ${String(obj.schemaVersion)}. Expected ${EXPORT_SCHEMA_VERSION}.`,
    );
  }
  if (!Array.isArray(obj.projects) || !Array.isArray(obj.dayNotes)) {
    throw new ImportError("Backup is missing projects or dayNotes.");
  }
  if (!obj.settings || typeof obj.settings !== "object") {
    throw new ImportError("Backup is missing settings.");
  }

  const projects = (obj.projects as Record<string, unknown>[]).map((p) =>
    reviveDates(p, ["startDate", "endDate", "createdAt", "updatedAt", "deletedAt"]),
  ) as unknown as Project[];

  const dayNotes = (obj.dayNotes as Record<string, unknown>[]).map((n) =>
    reviveDates(n, ["createdAt", "updatedAt", "deletedAt"]),
  ) as unknown as DayNote[];

  const settings = reviveDates(
    obj.settings as Record<string, unknown>,
    ["updatedAt"],
  ) as unknown as Settings;

  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: String(obj.exportedAt ?? ""),
    app: "zlate",
    appVersion: String(obj.appVersion ?? ""),
    projects,
    dayNotes,
    settings,
  };
}

export async function applyImport(rawJson: string): Promise<ImportResult> {
  const parsed = parseExport(JSON.parse(rawJson));
  const result: ImportResult = {
    projectsAdded: 0,
    projectsUpdated: 0,
    projectsSkipped: 0,
    notesAdded: 0,
    notesUpdated: 0,
    notesSkipped: 0,
    settingsUpdated: false,
  };

  await db.transaction("rw", db.projects, db.dayNotes, db.settings, async () => {
    for (const incoming of parsed.projects) {
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

    for (const incoming of parsed.dayNotes) {
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

    const localSettings = await db.settings.get(SETTINGS_ID);
    if (
      !localSettings ||
      parsed.settings.updatedAt.getTime() > localSettings.updatedAt.getTime()
    ) {
      await db.settings.put({ ...parsed.settings, id: SETTINGS_ID });
      result.settingsUpdated = true;
    }
  });

  return result;
}

export async function wipeAllData(): Promise<void> {
  await db.transaction("rw", db.projects, db.dayNotes, db.settings, async () => {
    await db.projects.clear();
    await db.dayNotes.clear();
    await db.settings.delete(SETTINGS_ID);
  });
}

export function downloadExport(file: ExportFile): void {
  const blob = new Blob([JSON.stringify(file, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = file.exportedAt.slice(0, 10); // YYYY-MM-DD
  a.href = url;
  a.download = `zlate-backup-${date}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
