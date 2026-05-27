"use client";

import { useSyncAutoTriggers } from "@/hooks/useSyncAutoTriggers";

/** Headless: installs auto-sync triggers and renders nothing. */
export function SyncAutoTriggers() {
  useSyncAutoTriggers();
  return null;
}
