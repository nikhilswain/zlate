"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { addDays, format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useUIStore, type PopoverAnchor } from "@/store/useUIStore";
import { useIsMobile } from "@/hooks/useIsMobile";
import { createProject } from "@/lib/projects";
import { PROJECT_EMOJIS, PROJECT_PALETTE } from "@/lib/palette";
import { ProjectRangeCalendar } from "./ProjectRangeCalendar";

const PALETTE = PROJECT_PALETTE;
const EMOJIS = PROJECT_EMOJIS;

type RangePreset = "today" | "7" | "14" | "30" | "custom";

const PRESETS: { id: RangePreset; label: string; days: number | null }[] = [
  { id: "today", label: "Today only", days: 0 },
  { id: "7", label: "7 days", days: 6 },
  { id: "14", label: "14 days", days: 13 },
  { id: "30", label: "30 days", days: 29 },
  { id: "custom", label: "Custom", days: null },
];

const POPOVER_WIDTH = 320;
const ESTIMATED_HEIGHT = 460;
const VIEWPORT_PAD = 16;
const ANCHOR_GAP = 8;

export function CreateProjectPopover() {
  const anchor = useUIStore((s) => s.popoverAnchor);

  return (
    <AnimatePresence>
      {anchor && (
        <PopoverContent
          key={anchor.day.toISOString()}
          anchor={anchor}
        />
      )}
    </AnimatePresence>
  );
}

function PopoverContent({ anchor }: { anchor: PopoverAnchor }) {
  const close = useUIStore((s) => s.closeCreatePopover);
  const isMobile = useIsMobile();
  const popoverRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(PALETTE[5]);
  const [icon, setIcon] = useState<string | undefined>(undefined);
  const [presetId, setPresetId] = useState<RangePreset>("7");
  const [customStart, setCustomStart] = useState<string>(
    format(anchor.day, "yyyy-MM-dd"),
  );
  const [customEnd, setCustomEnd] = useState<string>(
    format(addDays(anchor.day, 6), "yyyy-MM-dd"),
  );
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (isMobile) return;
    const el = popoverRef.current;
    if (!el) return;
    const update = () => setMeasuredHeight(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isMobile]);

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
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [close]);

  const { startDate, endDate } = useMemo(() => {
    if (presetId === "custom") {
      const s = customStart
        ? new Date(`${customStart}T00:00:00`)
        : anchor.day;
      const e = customEnd ? new Date(`${customEnd}T00:00:00`) : anchor.day;
      return s <= e
        ? { startDate: s, endDate: e }
        : { startDate: e, endDate: s };
    }
    const preset = PRESETS.find((p) => p.id === presetId);
    const days = preset?.days ?? 0;
    return { startDate: anchor.day, endDate: addDays(anchor.day, days) };
  }, [anchor.day, presetId, customStart, customEnd]);

  const position = useMemo(() => {
    const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    const height = measuredHeight ?? ESTIMATED_HEIGHT;
    let left = anchor.rect.left + anchor.rect.width + ANCHOR_GAP;
    if (left + POPOVER_WIDTH + VIEWPORT_PAD > vw) {
      left = anchor.rect.left - POPOVER_WIDTH - ANCHOR_GAP;
    }
    if (left < VIEWPORT_PAD) left = VIEWPORT_PAD;
    let top = anchor.rect.top;
    if (top + height + VIEWPORT_PAD > vh) {
      top = Math.max(VIEWPORT_PAD, vh - height - VIEWPORT_PAD);
    }
    return { top, left };
  }, [anchor, measuredHeight]);

  async function handleCreate() {
    if (!name.trim()) return;
    await createProject({
      name,
      icon,
      baseColor: color,
      startDate,
      endDate,
    });
    close();
  }

  return (
    <>
      {isMobile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-40 bg-overlay backdrop-blur-sm"
        />
      )}
      <motion.div
        ref={popoverRef}
        role="dialog"
        aria-label="Create project"
        onPointerDown={(e) => e.stopPropagation()}
        initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.96, y: 4 }}
        animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
        exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.96, y: 4 }}
        transition={{
          duration: isMobile ? 0.28 : 0.16,
          ease: [0.16, 1, 0.3, 1],
        }}
        className={
          isMobile
            ? "fixed z-50 bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto bg-surface-elevated border-t border-border rounded-t-2xl shadow-2xl"
            : "fixed z-50 bg-surface-elevated border border-border rounded-lg shadow-2xl"
        }
        style={
          isMobile
            ? undefined
            : { top: position.top, left: position.left, width: POPOVER_WIDTH }
        }
      >
        {isMobile && (
          <div className="flex justify-center pt-2 pb-1 shrink-0 sticky top-0 bg-surface-elevated">
            <div className="w-10 h-1 rounded-full bg-fg-subtle/40" />
          </div>
        )}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <div className="text-sm font-medium text-fg">New project</div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="text-fg-muted hover:text-fg transition-colors"
          >
            <X size={14} />
          </button>
        </header>

        <div className="p-4 flex flex-col gap-4">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) {
                e.preventDefault();
                void handleCreate();
              }
            }}
            placeholder="Project name"
            className="bg-bg border border-border rounded-md px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:border-fg-muted transition-colors"
          />

          <Field label="Color">
            <div className="grid grid-cols-8 gap-1.5">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
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
                onClick={() => setIcon(undefined)}
                aria-label="No icon"
                className={
                  "size-6 rounded-full text-xs flex items-center justify-center transition-colors " +
                  (!icon
                    ? "bg-fg/10 text-fg"
                    : "text-fg-subtle hover:bg-fg/5")
                }
              >
                ∅
              </button>
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setIcon(e)}
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
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPresetId(p.id)}
                  className={
                    "px-2.5 py-1 text-[11px] rounded-full border transition-colors " +
                    (presetId === p.id
                      ? "bg-fg text-bg border-fg"
                      : "border-border text-fg-muted hover:text-fg hover:border-fg-muted")
                  }
                >
                  {p.label}
                </button>
              ))}
            </div>
            {presetId === "custom" && (
              <div className="mt-2">
                <ProjectRangeCalendar
                  value={{
                    from: customStart ? new Date(`${customStart}T00:00:00`) : undefined,
                    to: customEnd ? new Date(`${customEnd}T00:00:00`) : undefined,
                  }}
                  onChange={(range) => {
                    if (range?.from) {
                      setCustomStart(format(range.from, "yyyy-MM-dd"));
                    }
                    if (range?.to) {
                      setCustomEnd(format(range.to, "yyyy-MM-dd"));
                    }
                  }}
                  color={color}
                />
              </div>
            )}
          </Field>

          <div className="text-xs text-fg-subtle">
            {format(startDate, "EEE, MMM d")} → {format(endDate, "EEE, MMM d")}
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border-subtle">
          <button
            type="button"
            onClick={close}
            className="px-3 py-1.5 text-xs text-fg-muted hover:text-fg rounded transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!name.trim()}
            className="px-3 py-1.5 text-xs font-medium bg-fg text-bg rounded disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            Create
          </button>
        </footer>
      </motion.div>
    </>
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
