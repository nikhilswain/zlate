"use client";

import { create } from "zustand";

export type AnchorRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export type PopoverAnchor = { day: Date; rect: AnchorRect };
export type DayNoteSelection = { projectId: string; dateKey: string };

type UIState = {
  currentDate: Date;
  setCurrentDate: (d: Date) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  selectedDayNote: DayNoteSelection | null;
  openDayNote: (projectId: string, dateKey: string) => void;
  closeDayNote: () => void;
  popoverAnchor: PopoverAnchor | null;
  openCreatePopover: (day: Date, rect: AnchorRect) => void;
  closeCreatePopover: () => void;
  dayOverflowPopover: PopoverAnchor | null;
  openDayOverflowPopover: (day: Date, rect: AnchorRect) => void;
  closeDayOverflowPopover: () => void;
  focusedProjectIds: Set<string>;
  toggleFocus: (id: string) => void;
  clearFocus: () => void;
  projectIdPendingDelete: string | null;
  askDeleteProject: (id: string) => void;
  cancelDeleteProject: () => void;
};

export const useUIStore = create<UIState>((set) => ({
  currentDate: new Date(),
  setCurrentDate: (d) => set({ currentDate: d }),
  selectedProjectId: null,
  setSelectedProjectId: (id) =>
    set({
      selectedProjectId: id,
      selectedDayNote: null,
      popoverAnchor: null,
      dayOverflowPopover: null,
    }),
  selectedDayNote: null,
  openDayNote: (projectId, dateKey) =>
    set({
      selectedDayNote: { projectId, dateKey },
      selectedProjectId: null,
      popoverAnchor: null,
      dayOverflowPopover: null,
    }),
  closeDayNote: () => set({ selectedDayNote: null }),
  popoverAnchor: null,
  openCreatePopover: (day, rect) =>
    set({
      popoverAnchor: { day, rect },
      selectedProjectId: null,
      selectedDayNote: null,
      dayOverflowPopover: null,
    }),
  closeCreatePopover: () => set({ popoverAnchor: null }),
  dayOverflowPopover: null,
  openDayOverflowPopover: (day, rect) =>
    set({
      dayOverflowPopover: { day, rect },
      popoverAnchor: null,
      selectedProjectId: null,
      selectedDayNote: null,
    }),
  closeDayOverflowPopover: () => set({ dayOverflowPopover: null }),
  focusedProjectIds: new Set(),
  toggleFocus: (id) =>
    set((state) => {
      const next = new Set(state.focusedProjectIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { focusedProjectIds: next };
    }),
  clearFocus: () => set({ focusedProjectIds: new Set() }),
  projectIdPendingDelete: null,
  askDeleteProject: (id) => set({ projectIdPendingDelete: id }),
  cancelDeleteProject: () => set({ projectIdPendingDelete: null }),
}));
