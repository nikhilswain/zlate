"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { Trash2, X } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useUIStore } from "@/store/useUIStore";
import { softDeleteProject, updateProject } from "@/lib/projects";
import { PROJECT_EMOJIS, PROJECT_PALETTE } from "@/lib/palette";

const PALETTE = PROJECT_PALETTE;
const EMOJIS = PROJECT_EMOJIS;

export function ProjectDetailPanel() {
  const selectedProjectId = useUIStore((s) => s.selectedProjectId);
  const setSelectedProjectId = useUIStore((s) => s.setSelectedProjectId);
  const project = useLiveQuery(
    () => (selectedProjectId ? db.projects.get(selectedProjectId) : null),
    [selectedProjectId],
  );
  const open = !!selectedProjectId && !!project && project.deletedAt === null;

  return (
    <AnimatePresence>
      {open && project && (
        <PanelInner
          key={project.id}
          projectId={project.id}
          initialName={project.name}
          initialIcon={project.icon}
          initialColor={project.baseColor}
          initialStart={project.startDate}
          initialEnd={project.endDate}
          onClose={() => setSelectedProjectId(null)}
        />
      )}
    </AnimatePresence>
  );
}

type InnerProps = {
  projectId: string;
  initialName: string;
  initialIcon: string | undefined;
  initialColor: string;
  initialStart: Date;
  initialEnd: Date;
  onClose: () => void;
};

function PanelInner({
  projectId,
  initialName,
  initialIcon,
  initialColor,
  initialStart,
  initialEnd,
  onClose,
}: InnerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [name, setName] = useState(initialName);
  const [icon, setIcon] = useState<string | undefined>(initialIcon);
  const [color, setColor] = useState(initialColor);
  const [startStr, setStartStr] = useState(format(initialStart, "yyyy-MM-dd"));
  const [endStr, setEndStr] = useState(format(initialEnd, "yyyy-MM-dd"));

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [onClose]);

  const { startDate, endDate } = useMemo(() => {
    const s = new Date(`${startStr}T00:00:00`);
    const e = new Date(`${endStr}T00:00:00`);
    return s <= e ? { startDate: s, endDate: e } : { startDate: e, endDate: s };
  }, [startStr, endStr]);

  async function commitChange(patch: Parameters<typeof updateProject>[1]) {
    await updateProject(projectId, patch);
  }

  async function handleDelete() {
    await softDeleteProject(projectId);
    onClose();
  }

  return (
    <motion.aside
      ref={panelRef}
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      onPointerDown={(e) => e.stopPropagation()}
      className="fixed top-0 right-0 z-40 h-full w-[360px] bg-surface-elevated border-l border-border shadow-2xl flex flex-col"
    >
      <header className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="size-3 rounded-full"
            style={{ background: color }}
          />
          {icon && <span aria-hidden className="text-base leading-none">{icon}</span>}
          <span className="text-sm font-medium text-fg">Project details</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-fg-muted hover:text-fg transition-colors"
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
              if (trimmed && trimmed !== initialName) {
                void commitChange({ name: trimmed });
              } else if (!trimmed) {
                setName(initialName);
              }
            }}
            className="w-full bg-bg border border-border rounded-md px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:border-fg-muted transition-colors"
          />
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
          <div className="flex gap-2">
            <input
              type="date"
              value={startStr}
              onChange={(e) => setStartStr(e.target.value)}
              onBlur={() => void commitChange({ startDate, endDate })}
              className="flex-1 bg-bg border border-border rounded px-2 py-1.5 text-xs text-fg"
            />
            <input
              type="date"
              value={endStr}
              onChange={(e) => setEndStr(e.target.value)}
              onBlur={() => void commitChange({ startDate, endDate })}
              className="flex-1 bg-bg border border-border rounded px-2 py-1.5 text-xs text-fg"
            />
          </div>
          <div className="mt-2 text-[11px] text-fg-subtle">
            {format(startDate, "EEE, MMM d")} → {format(endDate, "EEE, MMM d")}
          </div>
        </Field>
      </div>

      <footer className="px-5 py-4 border-t border-border-subtle">
        {confirmDelete ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-fg-muted">Delete this project?</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-1.5 text-xs text-fg-muted hover:text-fg rounded transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-1.5 text-xs font-medium bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-2 text-xs text-fg-muted hover:text-red-400 transition-colors"
          >
            <Trash2 size={14} />
            Delete project
          </button>
        )}
      </footer>
    </motion.aside>
  );
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
