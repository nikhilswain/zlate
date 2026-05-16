"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, format } from "date-fns";
import { X } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";
import { createProject } from "@/lib/projects";
import { PROJECT_EMOJIS, PROJECT_PALETTE } from "@/lib/palette";

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
  const close = useUIStore((s) => s.closeCreatePopover);

  const popoverRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(PALETTE[5]);
  const [icon, setIcon] = useState<string | undefined>(undefined);
  const [presetId, setPresetId] = useState<RangePreset>("7");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");

  useEffect(() => {
    if (!anchor) return;
    setName("");
    setColor(PALETTE[5]);
    setIcon(undefined);
    setPresetId("7");
    setCustomStart(format(anchor.day, "yyyy-MM-dd"));
    setCustomEnd(format(addDays(anchor.day, 6), "yyyy-MM-dd"));
  }, [anchor]);

  useEffect(() => {
    if (!anchor) return;
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
  }, [anchor, close]);

  const { startDate, endDate } = useMemo(() => {
    if (!anchor) return { startDate: new Date(), endDate: new Date() };
    if (presetId === "custom") {
      const s = customStart
        ? new Date(`${customStart}T00:00:00`)
        : anchor.day;
      const e = customEnd ? new Date(`${customEnd}T00:00:00`) : anchor.day;
      return s <= e ? { startDate: s, endDate: e } : { startDate: e, endDate: s };
    }
    const preset = PRESETS.find((p) => p.id === presetId);
    const days = preset?.days ?? 0;
    return { startDate: anchor.day, endDate: addDays(anchor.day, days) };
  }, [anchor, presetId, customStart, customEnd]);

  const position = useMemo(() => {
    if (!anchor) return null;
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

  if (!anchor || !position) return null;

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
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Create project"
      onPointerDown={(e) => e.stopPropagation()}
      className="fixed z-50 bg-surface-elevated border border-border rounded-lg shadow-2xl"
      style={{ top: position.top, left: position.left, width: POPOVER_WIDTH }}
    >
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
            <div className="flex gap-2 mt-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="flex-1 bg-bg border border-border rounded px-2 py-1 text-xs text-fg"
              />
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="flex-1 bg-bg border border-border rounded px-2 py-1 text-xs text-fg"
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
    </div>
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
