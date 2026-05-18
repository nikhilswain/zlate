import { db } from "./db";
import { DEFAULT_SETTINGS, SETTINGS_ID } from "./settings";
import {
  getSyncMeta,
  setAccountId,
  setLastSyncedAt,
  clearSyncMeta,
} from "./syncMeta";
import { mergeRowsIntoDexie } from "./mergeRows";
import {
  dayNoteFromWire,
  dayNoteToWire,
  projectFromWire,
  projectToWire,
  settingsFromWire,
  settingsToWire,
  type DayNoteWire,
  type ProjectWire,
  type SettingsWire,
} from "./wireFormat";

export type SyncResult = {
  pushed: { projects: number; dayNotes: number; settingsUpdated: boolean };
  pulled: { projects: number; dayNotes: number; settingsUpdated: boolean };
  serverTime: string;
};

export class SyncError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "SyncError";
  }
}

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

export async function registerAccount(): Promise<{ accountId: string }> {
  const response = await fetch("/api/sync/register", { method: "POST" });
  if (!response.ok) {
    throw new SyncError(await parseError(response), response.status);
  }
  const data = (await response.json()) as { accountId: string };
  await setAccountId(data.accountId);
  return { accountId: data.accountId };
}

export async function generatePairingCode(): Promise<{
  code: string;
  expiresAt: string;
}> {
  const meta = await getSyncMeta();
  if (!meta.accountId) {
    throw new SyncError("Set up sync first.");
  }
  const response = await fetch("/api/sync/pair/create", {
    method: "POST",
    headers: { Authorization: `Bearer ${meta.accountId}` },
  });
  if (!response.ok) {
    throw new SyncError(await parseError(response), response.status);
  }
  return (await response.json()) as { code: string; expiresAt: string };
}

export async function checkPairingStatus(
  code: string,
): Promise<{ exists: boolean; used: boolean; expired: boolean }> {
  const response = await fetch(
    `/api/sync/pair/status?code=${encodeURIComponent(code)}`,
    { method: "GET" },
  );
  if (!response.ok) {
    throw new SyncError(await parseError(response), response.status);
  }
  return (await response.json()) as {
    exists: boolean;
    used: boolean;
    expired: boolean;
  };
}

export async function redeemPairingCode(
  code: string,
): Promise<{ accountId: string }> {
  const response = await fetch("/api/sync/pair/redeem", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  if (!response.ok) {
    throw new SyncError(await parseError(response), response.status);
  }
  const data = (await response.json()) as { accountId: string };
  await setAccountId(data.accountId);
  await setLastSyncedAt(null);
  return { accountId: data.accountId };
}

export async function signOut(): Promise<void> {
  await clearSyncMeta();
}

export async function getSyncStatus(): Promise<{
  accountId: string | null;
  lastSyncedAt: string | null;
}> {
  const meta = await getSyncMeta();
  return { accountId: meta.accountId, lastSyncedAt: meta.lastSyncedAt };
}

// Tolerate up to this much clock skew between devices and the server. Both
// push (which rows to include) and pull (which rows the server returns) use
// a cursor shifted back by this amount. The LWW merge cheaply discards the
// extra rows. Without this, a row stamped slightly before `lastSyncedAt` due
// to a slow device clock would be silently skipped forever.
const CLOCK_SKEW_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

export async function syncNow(): Promise<SyncResult> {
  const meta = await getSyncMeta();
  if (!meta.accountId) {
    throw new SyncError("Set up sync first.");
  }

  // ── Push: send everything updated since (last sync − skew buffer) ──
  const since = meta.lastSyncedAt;
  const sinceMs = since
    ? new Date(since).getTime() - CLOCK_SKEW_BUFFER_MS
    : 0;
  const bufferedSince = since
    ? new Date(new Date(since).getTime() - CLOCK_SKEW_BUFFER_MS).toISOString()
    : null;

  const [allProjects, allNotes, currentSettings] = await Promise.all([
    db.projects.toArray(),
    db.dayNotes.toArray(),
    db.settings.get(SETTINGS_ID),
  ]);

  const pushProjects = allProjects.filter(
    (p) => p.updatedAt.getTime() > sinceMs,
  );
  const pushNotes = allNotes.filter((n) => n.updatedAt.getTime() > sinceMs);
  const settingsRow = currentSettings ?? DEFAULT_SETTINGS;
  const pushSettings =
    settingsRow.updatedAt.getTime() > sinceMs ? settingsRow : null;

  const pushBody = {
    projects: pushProjects.map(projectToWire),
    dayNotes: pushNotes.map(dayNoteToWire),
    settings: pushSettings ? settingsToWire(pushSettings) : null,
  };

  const pushResponse = await fetch("/api/sync/push", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${meta.accountId}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(pushBody),
  });
  if (!pushResponse.ok) {
    throw new SyncError(await parseError(pushResponse), pushResponse.status);
  }
  const pushed = (await pushResponse.json()) as {
    applied: { projects: number; dayNotes: number; settingsUpdated: boolean };
  };

  // ── Pull: get everything changed on the server since (last sync − skew buffer) ──
  const pullUrl = bufferedSince
    ? `/api/sync/pull?since=${encodeURIComponent(bufferedSince)}`
    : "/api/sync/pull";
  const pullResponse = await fetch(pullUrl, {
    method: "GET",
    headers: { Authorization: `Bearer ${meta.accountId}` },
  });
  if (!pullResponse.ok) {
    throw new SyncError(await parseError(pullResponse), pullResponse.status);
  }
  const pullData = (await pullResponse.json()) as {
    projects: ProjectWire[];
    dayNotes: DayNoteWire[];
    settings: SettingsWire | null;
    serverTime: string;
  };

  const incomingProjects = pullData.projects.map(projectFromWire);
  const incomingNotes = pullData.dayNotes.map(dayNoteFromWire);
  const incomingSettings = pullData.settings
    ? settingsFromWire(pullData.settings)
    : null;

  let merge: Awaited<ReturnType<typeof mergeRowsIntoDexie>>;
  await db.transaction(
    "rw",
    db.projects,
    db.dayNotes,
    db.settings,
    async () => {
      merge = await mergeRowsIntoDexie({
        projects: incomingProjects,
        dayNotes: incomingNotes,
        settings: incomingSettings,
      });
    },
  );

  await setLastSyncedAt(pullData.serverTime);

  return {
    pushed: pushed.applied,
    pulled: {
      projects: merge!.projectsAdded + merge!.projectsUpdated,
      dayNotes: merge!.notesAdded + merge!.notesUpdated,
      settingsUpdated: merge!.settingsUpdated,
    },
    serverTime: pullData.serverTime,
  };
}
