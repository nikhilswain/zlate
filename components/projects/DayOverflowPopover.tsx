"use client";

import { useEffect, useMemo, useRef } from "react";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useUIStore, type PopoverAnchor } from "@/store/useUIStore";
import { useProjects } from "@/hooks/useProjects";
import { useIsMobile } from "@/hooks/useIsMobile";
import { projectActiveOnDay, isPastDay } from "@/lib/dateRange";
import { readableTextColor } from "@/lib/contrast";
import { toDateKey } from "@/lib/dayNotes";

const POPOVER_WIDTH = 240;
const ESTIMATED_HEIGHT = 280;
const VIEWPORT_PAD = 16;
const ANCHOR_GAP = 8;

export function DayOverflowPopover() {
  const anchor = useUIStore((s) => s.dayOverflowPopover);

  return (
    <AnimatePresence>
      {anchor && (
        <PopoverContent key={anchor.day.toISOString()} anchor={anchor} />
      )}
    </AnimatePresence>
  );
}

function PopoverContent({ anchor }: { anchor: PopoverAnchor }) {
  const close = useUIStore((s) => s.closeDayOverflowPopover);
  const openDayNote = useUIStore((s) => s.openDayNote);
  const focused = useUIStore((s) => s.focusedProjectIds);
  const allProjects = useProjects();
  const popoverRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        close();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [close]);

  const projects = useMemo(() => {
    const active = allProjects.filter((p) =>
      projectActiveOnDay(p, anchor.day),
    );
    return focused.size === 0
      ? active
      : active.filter((p) => focused.has(p.id));
  }, [anchor.day, allProjects, focused]);

  const position = useMemo(() => {
    const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    let left = anchor.rect.left + anchor.rect.width + ANCHOR_GAP;
    if (left + POPOVER_WIDTH + VIEWPORT_PAD > vw) {
      left = anchor.rect.left - POPOVER_WIDTH - ANCHOR_GAP;
    }
    if (left < VIEWPORT_PAD) left = VIEWPORT_PAD;
    let top = anchor.rect.top;
    if (top + ESTIMATED_HEIGHT + VIEWPORT_PAD > vh) {
      top = Math.max(VIEWPORT_PAD, vh - ESTIMATED_HEIGHT - VIEWPORT_PAD);
    }
    return { top, left };
  }, [anchor]);

  const past = isPastDay(anchor.day);

  if (isMobile) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-40 bg-overlay backdrop-blur-sm"
        />
        <motion.div
          ref={popoverRef}
          role="dialog"
          aria-label={`Projects on ${format(anchor.day, "MMM d")}`}
          onPointerDown={(e) => e.stopPropagation()}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-0 left-0 right-0 z-50 max-h-[70vh] bg-surface-elevated border-t border-border shadow-2xl rounded-t-2xl flex flex-col"
        >
          <div className="flex justify-center pt-2 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-fg-subtle/40" />
          </div>
          <header className="flex items-center justify-between px-4 py-2.5 border-b border-border-subtle shrink-0">
            <div className="text-[11px] uppercase tracking-wider text-fg-subtle leading-none">
              {format(anchor.day, "EEE, MMM d")}
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="text-fg-muted hover:text-fg transition-colors"
            >
              <X size={14} />
            </button>
          </header>
          <div className="p-3 overflow-y-auto flex flex-col gap-1.5">
            {projects.length === 0 ? (
              <div className="px-2 py-2 text-xs text-fg-muted">
                No projects.
              </div>
            ) : (
              projects.map((p) => {
                const text = readableTextColor(p.baseColor);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      openDayNote(p.id, toDateKey(anchor.day))
                    }
                    className="w-full flex items-center gap-2 px-2.5 h-10 rounded-md text-left transition-shadow hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]"
                    style={{
                      background: p.baseColor,
                      color: text,
                      opacity: past ? 0.6 : 1,
                    }}
                  >
                    {p.icon ? (
                      <span aria-hidden className="text-sm leading-none">
                        {p.icon}
                      </span>
                    ) : (
                      <span
                        aria-hidden
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: text, opacity: 0.55 }}
                      />
                    )}
                    <span className="text-[13px] font-medium leading-none truncate">
                      {p.name}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </motion.div>
      </>
    );
  }

  return (
    <div
      className="fixed z-50"
      style={{ top: position.top, left: position.left, width: POPOVER_WIDTH }}
    >
      <motion.div
        ref={popoverRef}
        role="dialog"
        aria-label={`Projects on ${format(anchor.day, "MMM d")}`}
        onPointerDown={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 4 }}
        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        className="bg-surface-elevated border border-border rounded-lg shadow-2xl"
      >
        <header className="flex items-center justify-between px-3 py-2.5 border-b border-border-subtle">
          <div className="text-[10px] uppercase tracking-wider text-fg-subtle leading-none">
            {format(anchor.day, "EEE, MMM d")}
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="text-fg-muted hover:text-fg transition-colors"
          >
            <X size={13} />
          </button>
        </header>

        <div className="p-2 max-h-[280px] overflow-y-auto flex flex-col gap-1">
          {projects.length === 0 ? (
            <div className="px-2 py-2 text-xs text-fg-muted">No projects.</div>
          ) : (
            projects.map((p) => {
              const text = readableTextColor(p.baseColor);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => openDayNote(p.id, toDateKey(anchor.day))}
                  className="w-full flex items-center gap-2 px-1.5 h-7 rounded-md text-left transition-shadow hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]"
                  style={{
                    background: p.baseColor,
                    color: text,
                    opacity: past ? 0.6 : 1,
                  }}
                >
                  {p.icon ? (
                    <span aria-hidden className="text-xs leading-none">
                      {p.icon}
                    </span>
                  ) : (
                    <span
                      aria-hidden
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ background: text, opacity: 0.55 }}
                    />
                  )}
                  <span className="text-[11px] font-medium leading-none truncate">
                    {p.name}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
}
