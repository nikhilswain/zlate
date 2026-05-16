import { db } from "./db";
import { softDeleteDayNotesForProject } from "./dayNotes";
import type { Project } from "@/types/project";

type CreateInput = {
  name: string;
  icon?: string;
  baseColor: string;
  startDate: Date;
  endDate: Date;
};

type UpdateInput = Partial<{
  name: string;
  icon: string | undefined;
  baseColor: string;
  description: string | undefined;
  startDate: Date;
  endDate: Date;
}>;

export const MAX_DESCRIPTION_CHARS = 280;

function normalizeDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

export async function createProject(input: CreateInput): Promise<string> {
  const now = new Date();
  const project: Project = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    icon: input.icon,
    baseColor: input.baseColor,
    startDate: normalizeDay(input.startDate),
    endDate: normalizeDay(input.endDate),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  await db.projects.add(project);
  return project.id;
}

export async function updateProject(
  id: string,
  patch: UpdateInput,
): Promise<void> {
  const existing = await db.projects.get(id);
  if (!existing || existing.deletedAt !== null) return;

  const next: Project = { ...existing, updatedAt: new Date() };
  if (patch.name !== undefined) next.name = patch.name.trim();
  if (patch.icon !== undefined) next.icon = patch.icon || undefined;
  if (patch.startDate !== undefined) next.startDate = normalizeDay(patch.startDate);
  if (patch.endDate !== undefined) next.endDate = normalizeDay(patch.endDate);
  if (patch.baseColor !== undefined) next.baseColor = patch.baseColor;
  if (patch.description !== undefined) {
    const trimmed = patch.description.trim();
    next.description = trimmed.length > 0 ? trimmed : undefined;
  }
  await db.projects.put(next);
}

export async function softDeleteProject(id: string): Promise<void> {
  const existing = await db.projects.get(id);
  if (!existing || existing.deletedAt !== null) return;
  await db.projects.put({
    ...existing,
    deletedAt: new Date(),
    updatedAt: new Date(),
  });
  await softDeleteDayNotesForProject(id);
}
