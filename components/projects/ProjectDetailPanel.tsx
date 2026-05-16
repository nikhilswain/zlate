"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useUIStore } from "@/store/useUIStore";
import { DayNoteView } from "./DayNoteView";
import { ProjectSettingsView } from "./ProjectSettingsView";

export function ProjectDetailPanel() {
  const selectedProjectId = useUIStore((s) => s.selectedProjectId);
  const selectedDayNote = useUIStore((s) => s.selectedDayNote);
  const setSelectedProjectId = useUIStore((s) => s.setSelectedProjectId);
  const closeDayNote = useUIStore((s) => s.closeDayNote);
  const projectIdPendingDelete = useUIStore((s) => s.projectIdPendingDelete);

  const activeProjectId = selectedDayNote
    ? selectedDayNote.projectId
    : selectedProjectId;

  const project = useLiveQuery(
    () => (activeProjectId ? db.projects.get(activeProjectId) : undefined),
    [activeProjectId],
  );

  const open = !!activeProjectId && !!project && project.deletedAt === null;
  const mode: "day" | "project" | null = !open
    ? null
    : selectedDayNote
      ? "day"
      : "project";

  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        if (projectIdPendingDelete) return;
        if (selectedDayNote) closeDayNote();
        else setSelectedProjectId(null);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [
    open,
    selectedDayNote,
    projectIdPendingDelete,
    closeDayNote,
    setSelectedProjectId,
  ]);

  return (
    <AnimatePresence>
      {open && project && mode && (
        <motion.aside
          ref={panelRef}
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          onPointerDown={(e) => e.stopPropagation()}
          className="fixed top-0 right-0 z-40 h-full w-[360px] bg-surface-elevated border-l border-border shadow-2xl flex flex-col"
        >
          {mode === "day" && selectedDayNote ? (
            <DayNoteView
              key={`day-${selectedDayNote.projectId}-${selectedDayNote.dateKey}`}
              project={project}
              dateKey={selectedDayNote.dateKey}
              onClose={closeDayNote}
            />
          ) : (
            <ProjectSettingsView
              key={`project-${project.id}`}
              project={project}
              onClose={() => setSelectedProjectId(null)}
            />
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
