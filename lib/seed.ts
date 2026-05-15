import { db } from "./db";
import type { Project } from "@/types/project";

type SeedSpec = {
  name: string;
  icon: string;
  baseColor: string;
  startOffset: number;
  endOffset: number;
  createdOffset: number;
};

const SPECS: SeedSpec[] = [
  {
    name: "Shopify rebrand",
    icon: "🛍️",
    baseColor: "#22c55e",
    startOffset: -15,
    endOffset: 5,
    createdOffset: -45,
  },
  {
    name: "Creazilla site",
    icon: "🦎",
    baseColor: "#3b82f6",
    startOffset: -6,
    endOffset: 9,
    createdOffset: -25,
  },
  {
    name: "Inkspur API",
    icon: "✒️",
    baseColor: "#f59e0b",
    startOffset: 2,
    endOffset: 20,
    createdOffset: -12,
  },
];

function shift(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function specToProject(spec: SeedSpec, anchor: Date): Project {
  const created = shift(anchor, spec.createdOffset);
  return {
    id: crypto.randomUUID(),
    name: spec.name,
    icon: spec.icon,
    baseColor: spec.baseColor,
    startDate: shift(anchor, spec.startOffset),
    endDate: shift(anchor, spec.endOffset),
    createdAt: created,
    updatedAt: created,
    deletedAt: null,
  };
}

export async function seedIfEmpty(): Promise<void> {
  const count = await db.projects.count();
  if (count > 0) return;
  const anchor = new Date();
  await db.projects.bulkAdd(SPECS.map((s) => specToProject(s, anchor)));
}
