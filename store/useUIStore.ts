"use client";

import { create } from "zustand";

export type AnchorRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export type PopoverAnchor = { day: Date; rect: AnchorRect };

type UIState = {
  currentDate: Date;
  setCurrentDate: (d: Date) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  popoverAnchor: PopoverAnchor | null;
  openCreatePopover: (day: Date, rect: AnchorRect) => void;
  closeCreatePopover: () => void;
  focusedProjectIds: Set<string>;
  toggleFocus: (id: string) => void;
  clearFocus: () => void;
};

export const useUIStore = create<UIState>((set) => ({
  currentDate: new Date(),
  setCurrentDate: (d) => set({ currentDate: d }),
  selectedProjectId: null,
  setSelectedProjectId: (id) => set({ selectedProjectId: id, popoverAnchor: null }),
  popoverAnchor: null,
  openCreatePopover: (day, rect) =>
    set({ popoverAnchor: { day, rect }, selectedProjectId: null }),
  closeCreatePopover: () => set({ popoverAnchor: null }),
  focusedProjectIds: new Set(),
  toggleFocus: (id) =>
    set((state) => {
      const next = new Set(state.focusedProjectIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { focusedProjectIds: next };
    }),
  clearFocus: () => set({ focusedProjectIds: new Set() }),
}));
