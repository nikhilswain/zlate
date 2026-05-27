"use client";

import { useEffect } from "react";
import { scheduleAutoSync } from "@/lib/syncTriggers";

/**
 * Wires browser events to the auto-sync scheduler. Mount exactly once.
 * - boot: 500ms after mount (lets the UI paint), once per session
 * - visibilitychange → visible: re-sync when returning to the tab
 * - online: sync immediately on reconnect (offline only logs)
 * The scheduler itself no-ops when offline / not set up / throttled.
 */
export function useSyncAutoTriggers(): void {
  useEffect(() => {
    // Boot trigger.
    const bootTimer = setTimeout(() => scheduleAutoSync(0), 500);

    function onVisibility() {
      if (document.visibilityState === "visible") scheduleAutoSync(0);
    }
    function onOnline() {
      scheduleAutoSync(0);
    }
    function onOffline() {
      console.info("[sync] connection lost — pausing auto-sync");
    }

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      clearTimeout(bootTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);
}
