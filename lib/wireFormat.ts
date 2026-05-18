import type { DayNote, Project, Settings } from "@/types/project";

// ── snake_case wire shapes (matches Supabase column names) ──

export type ProjectWire = {
  id: string;
  name: string;
  icon: string | null;
  base_color: string;
  description: string | null;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type DayNoteWire = {
  id: string;
  project_id: string;
  date_key: string;
  text: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type SettingsWire = {
  theme: string;
  render_mode: string;
  view: string;
  week_starts_on: number;
  sidebar_collapsed: boolean;
  updated_at: string;
};

// ── client → wire ──

export function projectToWire(p: Project): ProjectWire {
  return {
    id: p.id,
    name: p.name,
    icon: p.icon ?? null,
    base_color: p.baseColor,
    description: p.description ?? null,
    start_date: p.startDate.toISOString(),
    end_date: p.endDate.toISOString(),
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
    deleted_at: p.deletedAt ? p.deletedAt.toISOString() : null,
  };
}

export function dayNoteToWire(n: DayNote): DayNoteWire {
  return {
    id: n.id,
    project_id: n.projectId,
    date_key: n.dateKey,
    text: n.text,
    created_at: n.createdAt.toISOString(),
    updated_at: n.updatedAt.toISOString(),
    deleted_at: n.deletedAt ? n.deletedAt.toISOString() : null,
  };
}

export function settingsToWire(s: Settings): SettingsWire {
  return {
    theme: s.theme,
    render_mode: s.renderMode,
    view: s.view,
    week_starts_on: s.weekStartsOn,
    sidebar_collapsed: s.sidebarCollapsed,
    updated_at: s.updatedAt.toISOString(),
  };
}

// ── wire → client ──

function reviveDate(v: string): Date {
  const d = new Date(v);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date in wire payload: ${v}`);
  }
  return d;
}

function reviveOptionalDate(v: string | null): Date | null {
  return v === null ? null : reviveDate(v);
}

export function projectFromWire(w: ProjectWire): Project {
  return {
    id: w.id,
    name: w.name,
    icon: w.icon ?? undefined,
    baseColor: w.base_color,
    description: w.description ?? undefined,
    startDate: reviveDate(w.start_date),
    endDate: reviveDate(w.end_date),
    createdAt: reviveDate(w.created_at),
    updatedAt: reviveDate(w.updated_at),
    deletedAt: reviveOptionalDate(w.deleted_at),
  };
}

export function dayNoteFromWire(w: DayNoteWire): DayNote {
  return {
    id: w.id,
    projectId: w.project_id,
    dateKey: w.date_key,
    text: w.text,
    createdAt: reviveDate(w.created_at),
    updatedAt: reviveDate(w.updated_at),
    deletedAt: reviveOptionalDate(w.deleted_at),
  };
}

export function settingsFromWire(w: SettingsWire): Settings {
  return {
    id: "singleton",
    theme: w.theme as Settings["theme"],
    renderMode: w.render_mode as Settings["renderMode"],
    view: w.view as Settings["view"],
    weekStartsOn: w.week_starts_on as Settings["weekStartsOn"],
    sidebarCollapsed: w.sidebar_collapsed,
    updatedAt: reviveDate(w.updated_at),
  };
}
