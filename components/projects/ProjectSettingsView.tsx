"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Trash2, X } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";
import { MAX_DESCRIPTION_CHARS, updateProject } from "@/lib/projects";
import { PROJECT_EMOJIS, PROJECT_PALETTE } from "@/lib/palette";
import { useProjectDayNotes } from "@/hooks/useProjectDayNotes";
import { CharCounter } from "./CharCounter";
import { ProjectRangeCalendar } from "./ProjectRangeCalendar";
import type { Project } from "@/types/project";

const PALETTE = PROJECT_PALETTE;
const EMOJIS = PROJECT_EMOJIS;

type Props = {
  project: Project;
  onClose: () => void;
};

export function ProjectSettingsView({ project, onClose }: Props) {
  const askDeleteProject = useUIStore((s) => s.askDeleteProject);
  const openDayNote = useUIStore((s) => s.openDayNote);
  const notes = useProjectDayNotes(project.id);

  const [name, setName] = useState(project.name);
  const [icon, setIcon] = useState<string | undefined>(project.icon);
  const [color, setColor] = useState(project.baseColor);
  const [description, setDescription] = useState(project.description ?? "");
  const [startStr, setStartStr] = useState(format(project.startDate, "yyyy-MM-dd"));
  const [endStr, setEndStr] = useState(format(project.endDate, "yyyy-MM-dd"));

  useEffect(() => {
    setName(project.name);
    setIcon(project.icon);
    setColor(project.baseColor);
    setDescription(project.description ?? "");
    setStartStr(format(project.startDate, "yyyy-MM-dd"));
    setEndStr(format(project.endDate, "yyyy-MM-dd"));
  }, [project.id, project.name, project.icon, project.baseColor, project.description, project.startDate, project.endDate]);

  const { startDate, endDate } = useMemo(() => {
    const s = new Date(`${startStr}T00:00:00`);
    const e = new Date(`${endStr}T00:00:00`);
    return s <= e ? { startDate: s, endDate: e } : { startDate: e, endDate: s };
  }, [startStr, endStr]);

  async function commitChange(patch: Parameters<typeof updateProject>[1]) {
    await updateProject(project.id, patch);
  }

  return (
    <>
      <header className="flex items-start justify-between px-5 py-4 border-b border-border-subtle">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            aria-hidden
            className="size-3.5 rounded-full shrink-0"
            style={{ background: color }}
          />
          {icon && (
            <span aria-hidden className="text-lg leading-none">
              {icon}
            </span>
          )}
          <span className="text-[15px] font-medium text-fg truncate">
            {project.name}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-fg-muted hover:text-fg transition-colors shrink-0"
        >
          <X size={16} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              const trimmed = name.trim();
              if (trimmed && trimmed !== project.name) {
                void commitChange({ name: trimmed });
              } else if (!trimmed) {
                setName(project.name);
              }
            }}
            className="w-full bg-bg border border-border rounded-md px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:border-fg-muted transition-colors"
          />
        </Field>

        <Field label="Description">
          <div className="relative">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => {
                const next = description.trim();
                const initial = project.description ?? "";
                if (next !== initial) void commitChange({ description });
              }}
              maxLength={MAX_DESCRIPTION_CHARS}
              rows={4}
              placeholder="A short note about this project…"
              className="w-full bg-bg border border-border rounded-md px-3 py-2 pr-9 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:border-fg-muted transition-colors resize-none leading-relaxed"
            />
            <div className="absolute bottom-2 right-2 pointer-events-none">
              <CharCounter
                count={description.length}
                max={MAX_DESCRIPTION_CHARS}
              />
            </div>
          </div>
        </Field>

        <Field label="Color">
          <div className="grid grid-cols-8 gap-1.5">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setColor(c);
                  void commitChange({ baseColor: c });
                }}
                aria-label={`Color ${c}`}
                className={
                  "size-6 rounded-full transition-shadow " +
                  (color === c
                    ? "ring-2 ring-ring ring-offset-2 ring-offset-surface-elevated"
                    : "hover:ring-1 hover:ring-fg-subtle hover:ring-offset-2 hover:ring-offset-surface-elevated")
                }
                style={{ background: c }}
              />
            ))}
          </div>
        </Field>

        <Field label="Icon">
          <div className="grid grid-cols-8 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setIcon(undefined);
                void commitChange({ icon: undefined });
              }}
              aria-label="No icon"
              className={
                "size-6 rounded-full text-xs flex items-center justify-center transition-colors " +
                (!icon ? "bg-fg/10 text-fg" : "text-fg-subtle hover:bg-fg/5")
              }
            >
              ∅
            </button>
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => {
                  setIcon(e);
                  void commitChange({ icon: e });
                }}
                className={
                  "size-6 rounded-full text-sm flex items-center justify-center transition-colors " +
                  (icon === e ? "bg-fg/10" : "hover:bg-fg/5")
                }
              >
                {e}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Range">
          <ProjectRangeCalendar
            value={{ from: startDate, to: endDate }}
            onChange={(range) => {
              if (range?.from) setStartStr(format(range.from, "yyyy-MM-dd"));
              if (range?.to) setEndStr(format(range.to, "yyyy-MM-dd"));
              // Commit immediately when both endpoints are set
              if (range?.from && range?.to) {
                const s = range.from <= range.to ? range.from : range.to;
                const e = range.from <= range.to ? range.to : range.from;
                void commitChange({ startDate: s, endDate: e });
              }
            }}
            color={color}
          />
          <div className="mt-2 text-[11px] text-fg-subtle">
            {format(startDate, "EEE, MMM d")} → {format(endDate, "EEE, MMM d")}
          </div>
        </Field>

        <NotesSection
          projectId={project.id}
          notes={notes}
          onOpen={(dateKey) => openDayNote(project.id, dateKey)}
        />
      </div>

      <footer className="px-5 py-4 border-t border-border-subtle">
        <button
          type="button"
          onClick={() => askDeleteProject(project.id)}
          className="flex items-center gap-2 text-xs text-fg-muted hover:text-red-400 transition-colors"
        >
          <Trash2 size={14} />
          Delete project
        </button>
      </footer>
    </>
  );
}

function NotesSection({
  notes,
  onOpen,
}: {
  projectId: string;
  notes: ReturnType<typeof useProjectDayNotes>;
  onOpen: (dateKey: string) => void;
}) {
  return (
    <Field label={`Notes (${notes.length})`}>
      {notes.length === 0 ? (
        <div className="text-[11px] text-fg-subtle leading-relaxed">
          No day notes yet. Click any day with this project on the calendar to add one.
        </div>
      ) : (
        <ul className="flex flex-col gap-1">
          {notes.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => onOpen(n.dateKey)}
                className="w-full flex flex-col gap-0.5 px-2.5 py-2 text-left rounded-md hover:bg-surface transition-colors border border-border-subtle"
              >
                <div className="text-[10.5px] text-fg-subtle font-medium tracking-wide">
                  {formatDateKeyLabel(n.dateKey)}
                </div>
                <div className="text-xs text-fg leading-snug line-clamp-2">
                  {n.text}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Field>
  );
}

function formatDateKeyLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00`);
  return format(d, "EEE, MMM d");
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-fg-subtle mb-2 font-medium">
        {label}
      </div>
      {children}
    </div>
  );
}
