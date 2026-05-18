"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useUIStore } from "@/store/useUIStore";
import { useIsMobile } from "@/hooks/useIsMobile";
import { DayNoteView } from "./DayNoteView";
import { ProjectSettingsView } from "./ProjectSettingsView";

export function ProjectDetailPanel() {
  const selectedProjectId = useUIStore((s) => s.selectedProjectId);
  const selectedDayNote = useUIStore((s) => s.selectedDayNote);
  const setSelectedProjectId = useUIStore((s) => s.setSelectedProjectId);
  const closeDayNote = useUIStore((s) => s.closeDayNote);
  const projectIdPendingDelete = useUIStore((s) => s.projectIdPendingDelete);
  const wipeAllOpen = useUIStore((s) => s.wipeAllOpen);
  const settingsOpen = useUIStore((s) => s.settingsOpen);
  const isMobile = useIsMobile();

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
        if (projectIdPendingDelete || wipeAllOpen || settingsOpen) return;
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
    wipeAllOpen,
    settingsOpen,
    closeDayNote,
    setSelectedProjectId,
  ]);

  return (
    <AnimatePresence>
      {open && project && mode && (
        <>
          {isMobile && (
            <motion.div
              key="panel-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-30 bg-overlay backdrop-blur-sm"
            />
          )}
          <motion.aside
            ref={panelRef}
            initial={isMobile ? { y: "100%" } : { x: "100%" }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: "100%" } : { x: "100%" }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            onPointerDown={(e) => e.stopPropagation()}
            className={
              isMobile
                ? "fixed bottom-0 left-0 right-0 z-40 max-h-[85vh] bg-surface-elevated border-t border-border shadow-2xl flex flex-col rounded-t-2xl overflow-hidden"
                : "fixed top-0 right-0 z-40 h-full w-[360px] bg-surface-elevated border-l border-border shadow-2xl flex flex-col"
            }
          >
            {isMobile && (
              <div className="flex justify-center pt-2 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full bg-fg-subtle/40" />
              </div>
            )}
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
        </>
      )}
    </AnimatePresence>
  );
}
