"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { ChevronRight, X } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";
import { useDayNote } from "@/hooks/useDayNote";
import { MAX_DAY_NOTE_CHARS, upsertDayNote } from "@/lib/dayNotes";
import { readableTextColor } from "@/lib/contrast";
import { isPastDay } from "@/lib/dateRange";
import { CharCounter } from "./CharCounter";
import type { Project } from "@/types/project";

type Props = {
  project: Project;
  dateKey: string;
  onClose: () => void;
};

export function DayNoteView({ project, dateKey, onClose }: Props) {
  const setSelectedProjectId = useUIStore((s) => s.setSelectedProjectId);
  const note = useDayNote(project.id, dateKey);

  const date = parseDateKey(dateKey);
  const past = isPastDay(date);

  const [text, setText] = useState(note?.text ?? "");
  const lastLoadedRef = useRef<{ projectId: string; dateKey: string } | null>(
    null,
  );

  useEffect(() => {
    const key = { projectId: project.id, dateKey };
    if (note === undefined) return;
    const last = lastLoadedRef.current;
    if (
      !last ||
      last.projectId !== key.projectId ||
      last.dateKey !== key.dateKey
    ) {
      setText(note?.text ?? "");
      lastLoadedRef.current = key;
    }
  }, [note, project.id, dateKey]);

  async function commit() {
    const persisted = note?.text ?? "";
    if (text.trim() === persisted.trim()) return;
    await upsertDayNote(project.id, dateKey, text);
  }

  const chipText = readableTextColor(project.baseColor);

  return (
    <>
      <header className="flex items-start justify-between px-5 py-4 border-b border-border-subtle">
        <div className="flex flex-col gap-2 min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-fg-subtle font-medium">
            Day note
          </div>
          <div
            className="text-[20px] font-medium text-fg leading-tight"
            style={{ opacity: past ? 0.85 : 1 }}
          >
            {format(date, "EEEE · MMM d")}
          </div>
          <button
            type="button"
            onClick={() => setSelectedProjectId(project.id)}
            className="self-start group flex items-center gap-1.5 mt-1 px-2 h-6 rounded-md text-[11px] font-medium transition-shadow hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]"
            style={{ background: project.baseColor, color: chipText }}
            aria-label={`Open project ${project.name}`}
          >
            {project.icon ? (
              <span aria-hidden className="text-[11px] leading-none">
                {project.icon}
              </span>
            ) : (
              <span
                aria-hidden
                className="size-1.5 rounded-full"
                style={{ background: chipText, opacity: 0.55 }}
              />
            )}
            <span className="truncate max-w-[180px]">{project.name}</span>
            <ChevronRight
              size={11}
              className="opacity-60 group-hover:opacity-100 transition-opacity"
            />
          </button>
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

      <div className="flex-1 overflow-y-auto p-5">
        <div className="relative">
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => void commit()}
            maxLength={MAX_DAY_NOTE_CHARS}
            rows={8}
            placeholder="What did you work on?"
            className="w-full bg-bg border border-border rounded-md px-3 py-2.5 pr-9 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:border-fg-muted transition-colors resize-none leading-relaxed"
          />
          <div className="absolute bottom-2 right-2 pointer-events-none">
            <CharCounter count={text.length} max={MAX_DAY_NOTE_CHARS} />
          </div>
        </div>
        <div className="mt-3 text-[10.5px] text-fg-subtle leading-relaxed">
          Saves automatically when you click outside.
        </div>
      </div>
    </>
  );
}

function parseDateKey(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00`);
}
