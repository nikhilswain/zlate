"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { X } from "lucide-react";
import { db } from "@/lib/db";
import { useUIStore } from "@/store/useUIStore";
import { softDeleteProject } from "@/lib/projects";

export function ProjectDeleteModal() {
  const pendingId = useUIStore((s) => s.projectIdPendingDelete);
  const cancel = useUIStore((s) => s.cancelDeleteProject);
  const focused = useUIStore((s) => s.focusedProjectIds);
  const toggleFocus = useUIStore((s) => s.toggleFocus);
  const setSelectedProjectId = useUIStore((s) => s.setSelectedProjectId);
  const closeDayNote = useUIStore((s) => s.closeDayNote);

  const project = useLiveQuery(
    () => (pendingId ? db.projects.get(pendingId) : undefined),
    [pendingId],
  );
  const [confirm, setConfirm] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!pendingId) return;
    setConfirm("");
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [pendingId]);

  const open = !!pendingId && !!project && project.deletedAt === null;
  const canDelete = open && confirm === project!.name;

  async function handleDelete() {
    if (!canDelete || !project) return;
    if (focused.has(project.id)) toggleFocus(project.id);
    setSelectedProjectId(null);
    closeDayNote();
    await softDeleteProject(project.id);
    cancel();
  }

  return (
    <AnimatePresence>
      {open && project && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={cancel}
            className="fixed inset-0 z-50 bg-overlay backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-label="Confirm delete project"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[400px] bg-surface-elevated border border-border rounded-lg shadow-2xl"
          >
            <header className="flex items-center justify-between px-5 py-3.5 border-b border-border-subtle">
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className="size-2.5 rounded-full"
                  style={{ background: project.baseColor }}
                />
                <div className="text-sm font-medium text-fg">
                  Delete project
                </div>
              </div>
              <button
                type="button"
                onClick={cancel}
                aria-label="Close"
                className="text-fg-muted hover:text-fg transition-colors"
              >
                <X size={14} />
              </button>
            </header>
            <div className="p-5 flex flex-col gap-3">
              <div className="text-[13px] text-fg-muted leading-relaxed">
                This action cannot be undone. Type{" "}
                <span className="font-medium text-fg break-all">
                  {project.name}
                </span>{" "}
                to confirm.
              </div>
              <input
                ref={inputRef}
                type="text"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onPaste={(e) => e.preventDefault()}
                onDrop={(e) => e.preventDefault()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canDelete) {
                    e.preventDefault();
                    void handleDelete();
                  }
                }}
                placeholder={project.name}
                spellCheck={false}
                autoComplete="off"
                className="bg-bg border border-border rounded-md px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:border-fg-muted transition-colors"
              />
            </div>
            <footer className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-border-subtle">
              <button
                type="button"
                onClick={cancel}
                className="px-3 py-1.5 text-xs text-fg-muted hover:text-fg rounded transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={!canDelete}
                className="px-3 py-1.5 text-xs font-medium bg-red-500 text-white rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-600 transition-colors"
              >
                Delete project
              </button>
            </footer>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
