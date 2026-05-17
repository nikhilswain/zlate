"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  addDays,
  addMonths,
  addYears,
  format,
  startOfWeek,
  subDays,
  subMonths,
  subYears,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  LayoutList,
  Menu,
  Rows3,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useUIStore } from "@/store/useUIStore";
import { useSettings } from "@/hooks/useSettings";
import { useIsMobile } from "@/hooks/useIsMobile";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { updateSettings } from "@/lib/settings";
import { MonthView } from "./MonthView";
import { WeekView } from "./WeekView";
import { YearHeatmap } from "./YearHeatmap";
import type { CalendarView } from "@/types/project";

const VIEW_OPTIONS: { id: CalendarView; label: string }[] = [
  { id: "month", label: "Month" },
  { id: "week", label: "Week" },
  { id: "year", label: "Year" },
];

export function CalendarShell() {
  const currentDate = useUIStore((s) => s.currentDate);
  const setCurrentDate = useUIStore((s) => s.setCurrentDate);
  const openMobileSidebar = useUIStore((s) => s.openMobileSidebar);
  const isMobile = useIsMobile();
  const { view, renderMode, weekStartsOn } = useSettings();
  const reduced = usePrefersReducedMotion();
  const prevViewRef = useRef<CalendarView>(view);
  const VIEW_ORDER: CalendarView[] = ["month", "week", "year"];
  const direction =
    VIEW_ORDER.indexOf(view) - VIEW_ORDER.indexOf(prevViewRef.current);
  useEffect(() => {
    prevViewRef.current = view;
  }, [view]);

  const heading = useMemo(() => {
    if (view === "month") return format(currentDate, "MMMM yyyy");
    if (view === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn });
      const end = addDays(start, 6);
      const sameMonth = start.getMonth() === end.getMonth();
      return sameMonth
        ? `${format(start, "MMM d")} – ${format(end, "d, yyyy")}`
        : `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
    }
    return format(currentDate, "yyyy");
  }, [view, currentDate, weekStartsOn]);

  function nav(direction: -1 | 1) {
    if (view === "month") {
      setCurrentDate(
        direction === -1
          ? subMonths(currentDate, 1)
          : addMonths(currentDate, 1),
      );
    } else if (view === "week") {
      setCurrentDate(
        direction === -1 ? subDays(currentDate, 7) : addDays(currentDate, 7),
      );
    } else {
      setCurrentDate(
        direction === -1
          ? subYears(currentDate, 1)
          : addYears(currentDate, 1),
      );
    }
  }

  const viewportRef = useRef<HTMLDivElement>(null);
  const navRef = useRef(nav);
  const viewModeRef = useRef(view);
  useEffect(() => {
    navRef.current = nav;
    viewModeRef.current = view;
  });

  useEffect(() => {
    const el = viewportRef.current;
    if (!el || isMobile) return;
    const QUIET_MS = 200;
    let gestureFired = false;
    let quietTimer: number | null = null;
    function onWheel(e: WheelEvent) {
      const absX = Math.abs(e.deltaX);
      const absY = Math.abs(e.deltaY);
      const horizontalDominant = absX > absY;
      if (viewModeRef.current === "year" && horizontalDominant) return;
      e.preventDefault();
      const delta = horizontalDominant ? e.deltaX : e.deltaY;
      if (Math.abs(delta) < 1) return;

      if (quietTimer !== null) window.clearTimeout(quietTimer);
      quietTimer = window.setTimeout(() => {
        gestureFired = false;
        quietTimer = null;
      }, QUIET_MS);

      if (gestureFired) return;
      gestureFired = true;
      navRef.current(delta > 0 ? 1 : -1);
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      if (quietTimer !== null) window.clearTimeout(quietTimer);
    };
  }, [isMobile]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el || !isMobile) return;
    const HORIZONTAL_THRESHOLD = 50;
    const MAX_DURATION = 600;
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let tracking = false;
    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) {
        tracking = false;
        return;
      }
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startTime = performance.now();
      tracking = true;
    }
    function onTouchEnd(e: TouchEvent) {
      if (!tracking) return;
      tracking = false;
      const touch = e.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      const dt = performance.now() - startTime;
      if (dt > MAX_DURATION) return;
      if (Math.abs(dx) < HORIZONTAL_THRESHOLD) return;
      if (Math.abs(dx) <= Math.abs(dy)) return;
      navRef.current(dx < 0 ? 1 : -1);
    }
    function onTouchCancel() {
      tracking = false;
    }
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchCancel, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [isMobile]);

  function toggleRenderMode() {
    void updateSettings({
      renderMode: renderMode === "pills" ? "painted" : "pills",
    });
  }

  return (
    <div className="flex flex-1 flex-col min-w-0">
      {/* Mobile header: two rows */}
      <header className="flex md:hidden flex-col gap-2 px-4 py-3 border-b border-border-subtle">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <IconButton label="Open sidebar" onClick={openMobileSidebar}>
              <Menu size={16} />
            </IconButton>
            <h2 className="text-lg font-medium text-fg whitespace-nowrap truncate">
              {heading}
            </h2>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <NavControls nav={nav} setCurrentDate={setCurrentDate} />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <ViewControls
            view={view}
            renderMode={renderMode}
            toggleRenderMode={toggleRenderMode}
          />
        </div>
      </header>

      {/* Desktop header: single row */}
      <header className="hidden md:flex items-center justify-between gap-4 px-6 py-4 border-b border-border-subtle">
        <h2 className="text-lg font-medium text-fg whitespace-nowrap">
          {heading}
        </h2>
        <div className="flex items-center gap-2">
          <ViewControls
            view={view}
            renderMode={renderMode}
            toggleRenderMode={toggleRenderMode}
          />
          <div className="w-px h-5 bg-border-subtle mx-1" />
          <NavControls nav={nav} setCurrentDate={setCurrentDate} />
        </div>
      </header>
      <div
        ref={viewportRef}
        className="flex-1 min-h-0 overflow-auto p-4 relative"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={view}
            initial={
              reduced
                ? { opacity: 0 }
                : { opacity: 0, x: direction >= 0 ? 24 : -24 }
            }
            animate={{ opacity: 1, x: 0 }}
            exit={
              reduced
                ? { opacity: 0 }
                : { opacity: 0, x: direction >= 0 ? -24 : 24 }
            }
            transition={{ duration: reduced ? 0.12 : 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="h-full"
          >
            {view === "month" && <MonthView />}
            {view === "week" && <WeekView />}
            {view === "year" && <YearHeatmap />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function NavControls({
  nav,
  setCurrentDate,
}: {
  nav: (d: -1 | 1) => void;
  setCurrentDate: (d: Date) => void;
}) {
  return (
    <>
      <IconButton label="Previous" onClick={() => nav(-1)}>
        <ChevronLeft size={16} />
      </IconButton>
      <button
        type="button"
        onClick={() => setCurrentDate(new Date())}
        className="px-3 py-1 text-xs font-medium text-fg-muted hover:text-fg rounded-full transition-colors"
      >
        Today
      </button>
      <IconButton label="Next" onClick={() => nav(1)}>
        <ChevronRight size={16} />
      </IconButton>
    </>
  );
}

function ViewControls({
  view,
  renderMode,
  toggleRenderMode,
}: {
  view: CalendarView;
  renderMode: "pills" | "painted";
  toggleRenderMode: () => void;
}) {
  return (
    <>
      <ViewSwitcher current={view} />
      {view !== "year" && (
        <IconButton
          label={
            renderMode === "pills"
              ? "Switch to painted mode"
              : "Switch to pills mode"
          }
          onClick={toggleRenderMode}
        >
          {renderMode === "pills" ? (
            <Rows3 size={15} />
          ) : (
            <LayoutList size={15} />
          )}
        </IconButton>
      )}
    </>
  );
}

function ViewSwitcher({ current }: { current: CalendarView }) {
  return (
    <div className="flex items-center gap-0.5 bg-bg rounded-full p-0.5">
      {VIEW_OPTIONS.map((opt) => {
        const active = current === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => void updateSettings({ view: opt.id })}
            className={
              "px-2.5 py-1 text-xs rounded-full transition-colors " +
              (active
                ? "bg-surface-elevated text-fg"
                : "text-fg-muted hover:text-fg")
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-fg-muted hover:bg-surface hover:text-fg transition-colors"
    >
      {children}
    </button>
  );
}
