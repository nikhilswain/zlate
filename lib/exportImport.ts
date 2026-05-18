import { db } from "./db";
import { DEFAULT_SETTINGS, SETTINGS_ID } from "./settings";
import type { DayNote, Project, Settings } from "@/types/project";
import { mergeRowsIntoDexie } from "./mergeRows";

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
    settings: settings ?? DEFAULT_SETTINGS,
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
      const d = new Date(v);
      if (isNaN(d.getTime())) {
        throw new ImportError(
          `Invalid date for field "${String(k)}": ${v}`,
        );
      }
      out[k] = d as T[keyof T];
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

  let merge: Awaited<ReturnType<typeof mergeRowsIntoDexie>>;
  await db.transaction(
    "rw",
    db.projects,
    db.dayNotes,
    db.settings,
    async () => {
      merge = await mergeRowsIntoDexie({
        projects: parsed.projects,
        dayNotes: parsed.dayNotes,
        settings: parsed.settings,
      });
    },
  );

  return {
    projectsAdded: merge!.projectsAdded,
    projectsUpdated: merge!.projectsUpdated,
    projectsSkipped: merge!.projectsSkipped,
    notesAdded: merge!.notesAdded,
    notesUpdated: merge!.notesUpdated,
    notesSkipped: merge!.notesSkipped,
    settingsUpdated: merge!.settingsUpdated,
  };
}

export async function wipeAllData(): Promise<void> {
  await db.transaction(
    "rw",
    db.projects,
    db.dayNotes,
    db.settings,
    db.syncMeta,
    async () => {
      await db.projects.clear();
      await db.dayNotes.clear();
      await db.settings.delete(SETTINGS_ID);
      await db.syncMeta.clear();
    },
  );
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
