import { syncWithRetry } from "./sync";
import { getSyncMeta } from "./syncMeta";

// Debounce coalesces rapid writes; throttle prevents back-to-back syncs from
// event bursts (tab thrashing, online flapping). They serve different roles:
// debounce waits for write-silence, throttle blocks if the LAST sync was recent.
const THROTTLE_MS = 5000;

// Debounce window applied after every local Dexie write.
export const WRITE_DEBOUNCE_MS = 5000;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let lastAutoSyncAt = 0;
let inFlightSync: Promise<void> | null = null;

function isOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

/**
 * Schedule an auto-sync after `delayMs` of quiet. A later call resets the
 * timer (coalescing). No-op when offline at schedule time — the `online`
 * event re-schedules on reconnect, and Dexie has already persisted the write.
 */
export function scheduleAutoSync(delayMs: number): void {
  if (isOffline()) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void runAutoSync();
  }, delayMs);
}

async function runAutoSync(): Promise<void> {
  if (isOffline()) return;

  // Throttle: if a sync ran too recently, don't drop this trigger — reschedule
  // it for when the throttle window clears, so reconnect/visibility syncs that
  // land just after a prior sync still happen (just slightly delayed).
  const elapsed = Date.now() - lastAutoSyncAt;
  if (elapsed < THROTTLE_MS) {
    scheduleAutoSync(THROTTLE_MS - elapsed);
    return;
  }

  const meta = await getSyncMeta();
  if (!meta.accountId) return; // sync not set up — nothing to do

  // Single-flight: if a sync is already running, don't start another.
  if (inFlightSync) {
    await inFlightSync;
    return;
  }

  lastAutoSyncAt = Date.now();
  inFlightSync = syncWithRetry();
  try {
    await inFlightSync;
  } finally {
    inFlightSync = null;
  }
}
