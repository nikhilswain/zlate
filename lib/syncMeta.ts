import { db } from "./db";
import type { SyncMeta } from "@/types/project";

export const SYNC_META_ID = "meta" as const;

const DEFAULT_SYNC_META: SyncMeta = {
  id: SYNC_META_ID,
  accountId: null,
  lastSyncedAt: null,
  lastSyncFailedAt: null,
  lastSyncError: null,
  isOffline: false,
};

export async function getSyncMeta(): Promise<SyncMeta> {
  const row = await db.syncMeta.get(SYNC_META_ID);
  // Spread defaults first so rows written before Phase 2 (missing the new
  // fields) read back as null/false instead of undefined.
  return row ? { ...DEFAULT_SYNC_META, ...row } : DEFAULT_SYNC_META;
}

export async function setAccountId(accountId: string | null): Promise<void> {
  const current = await getSyncMeta();
  await db.syncMeta.put({ ...current, accountId, id: SYNC_META_ID });
}

export async function setLastSyncedAt(
  lastSyncedAt: string | null,
): Promise<void> {
  const current = await getSyncMeta();
  await db.syncMeta.put({ ...current, lastSyncedAt, id: SYNC_META_ID });
}

export async function setSyncFailure(
  message: string,
  isOffline: boolean,
): Promise<void> {
  const current = await getSyncMeta();
  await db.syncMeta.put({
    ...current,
    id: SYNC_META_ID,
    lastSyncFailedAt: new Date().toISOString(),
    lastSyncError: message,
    isOffline,
  });
}

export async function clearSyncFailure(): Promise<void> {
  const current = await getSyncMeta();
  // Skip the write (and the useLiveQuery re-render) when there's nothing set.
  if (
    current.lastSyncFailedAt === null &&
    current.lastSyncError === null &&
    current.isOffline === false
  ) {
    return;
  }
  await db.syncMeta.put({
    ...current,
    id: SYNC_META_ID,
    lastSyncFailedAt: null,
    lastSyncError: null,
    isOffline: false,
  });
}

export async function clearSyncMeta(): Promise<void> {
  await db.syncMeta.delete(SYNC_META_ID);
}
