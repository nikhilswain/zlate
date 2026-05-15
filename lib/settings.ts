import { db } from "./db";
import type { Settings } from "@/types/project";

export const SETTINGS_ID = "singleton" as const;

export const DEFAULT_SETTINGS: Settings = {
  id: SETTINGS_ID,
  theme: "dark",
  renderMode: "pills",
  view: "month",
  weekStartsOn: 1,
  updatedAt: new Date(0),
};

type SettingsPatch = Partial<Omit<Settings, "id" | "updatedAt">>;

export async function updateSettings(patch: SettingsPatch): Promise<void> {
  const current = (await db.settings.get(SETTINGS_ID)) ?? DEFAULT_SETTINGS;
  const next: Settings = {
    ...current,
    ...patch,
    id: SETTINGS_ID,
    updatedAt: new Date(),
  };
  await db.settings.put(next);
}
