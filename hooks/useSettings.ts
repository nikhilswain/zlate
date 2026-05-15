"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { DEFAULT_SETTINGS, SETTINGS_ID } from "@/lib/settings";
import type { Settings } from "@/types/project";

export function useSettings(): Settings {
  const persisted = useLiveQuery(() => db.settings.get(SETTINGS_ID));
  return persisted ?? DEFAULT_SETTINGS;
}
