import { db } from "./db";
import type { SyncMeta } from "@/types/project";

export const SYNC_META_ID = "meta" as const;

const DEFAULT_SYNC_META: SyncMeta = {
  id: SYNC_META_ID,
  accountId: null,
  lastSyncedAt: null,
};

export async function getSyncMeta(): Promise<SyncMeta> {
  const row = await db.syncMeta.get(SYNC_META_ID);
  return row ?? DEFAULT_SYNC_META;
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

export async function clearSyncMeta(): Promise<void> {
  await db.syncMeta.delete(SYNC_META_ID);
}
