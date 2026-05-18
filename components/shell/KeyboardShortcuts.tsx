"use client";

import { useEffect } from "react";
import {
  addDays,
  addMonths,
  addYears,
  subDays,
  subMonths,
  subYears,
} from "date-fns";
import { useUIStore } from "@/store/useUIStore";
import { useSettings } from "@/hooks/useSettings";
import { updateSettings } from "@/lib/settings";
import type { CalendarView } from "@/types/project";

const VIEW_ORDER: CalendarView[] = ["month", "week", "year"];

export function KeyboardShortcuts() {
  const { view, renderMode } = useSettings();
  const currentDate = useUIStore((s) => s.currentDate);
  const setCurrentDate = useUIStore((s) => s.setCurrentDate);
  const popoverAnchor = useUIStore((s) => s.popoverAnchor);
  const dayOverflowPopover = useUIStore((s) => s.dayOverflowPopover);
  const selectedProjectId = useUIStore((s) => s.selectedProjectId);
  const selectedDayNote = useUIStore((s) => s.selectedDayNote);
  const focusedProjectIds = useUIStore((s) => s.focusedProjectIds);
  const projectIdPendingDelete = useUIStore((s) => s.projectIdPendingDelete);
  const mobileSidebarOpen = useUIStore((s) => s.mobileSidebarOpen);
  const closeCreatePopover = useUIStore((s) => s.closeCreatePopover);
  const closeDayOverflowPopover = useUIStore(
    (s) => s.closeDayOverflowPopover,
  );
  const setSelectedProjectId = useUIStore((s) => s.setSelectedProjectId);
  const closeDayNote = useUIStore((s) => s.closeDayNote);
  const clearFocus = useUIStore((s) => s.clearFocus);
  const cancelDeleteProject = useUIStore((s) => s.cancelDeleteProject);
  const closeMobileSidebar = useUIStore((s) => s.closeMobileSidebar);
  const wipeAllOpen = useUIStore((s) => s.wipeAllOpen);
  const settingsOpen = useUIStore((s) => s.settingsOpen);
  const cancelWipeAll = useUIStore((s) => s.cancelWipeAll);
  const closeSettings = useUIStore((s) => s.closeSettings);
  const pairingCodeModalOpen = useUIStore((s) => s.pairingCodeModalOpen);
  const closePairingCodeModal = useUIStore((s) => s.closePairingCodeModal);

  useEffect(() => {
    function isEditableTarget(t: EventTarget | null): boolean {
      if (!(t instanceof HTMLElement)) return false;
      const tag = t.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        t.isContentEditable
      );
    }

    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key !== "Escape" && isEditableTarget(e.target)) return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          setCurrentDate(
            view === "month"
              ? subMonths(currentDate, 1)
              : view === "week"
                ? subDays(currentDate, 7)
                : subYears(currentDate, 1),
          );
          break;
        case "ArrowRight":
          e.preventDefault();
          setCurrentDate(
            view === "month"
              ? addMonths(currentDate, 1)
              : view === "week"
                ? addDays(currentDate, 7)
                : addYears(currentDate, 1),
          );
          break;
        case "v":
        case "V": {
          const idx = VIEW_ORDER.indexOf(view);
          void updateSettings({
            view: VIEW_ORDER[(idx + 1) % VIEW_ORDER.length],
          });
          break;
        }
        case "m":
        case "M":
          if (view !== "year") {
            void updateSettings({
              renderMode: renderMode === "pills" ? "painted" : "pills",
            });
          }
          break;
        case "Escape":
          if (wipeAllOpen) {
            cancelWipeAll();
          } else if (pairingCodeModalOpen) {
            closePairingCodeModal();
          } else if (projectIdPendingDelete) {
            cancelDeleteProject();
          } else if (popoverAnchor) {
            closeCreatePopover();
          } else if (dayOverflowPopover) {
            closeDayOverflowPopover();
          } else if (settingsOpen) {
            closeSettings();
          } else if (selectedDayNote) {
            closeDayNote();
          } else if (selectedProjectId) {
            setSelectedProjectId(null);
          } else if (mobileSidebarOpen) {
            closeMobileSidebar();
          } else if (focusedProjectIds.size > 0) {
            clearFocus();
          }
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    view,
    renderMode,
    currentDate,
    popoverAnchor,
    dayOverflowPopover,
    selectedProjectId,
    selectedDayNote,
    focusedProjectIds,
    projectIdPendingDelete,
    mobileSidebarOpen,
    setCurrentDate,
    closeCreatePopover,
    closeDayOverflowPopover,
    setSelectedProjectId,
    closeDayNote,
    clearFocus,
    cancelDeleteProject,
    closeMobileSidebar,
    wipeAllOpen,
    settingsOpen,
    cancelWipeAll,
    closeSettings,
    pairingCodeModalOpen,
    closePairingCodeModal,
  ]);

  return null;
}
