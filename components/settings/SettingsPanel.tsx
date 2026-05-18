"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useSettings } from "@/hooks/useSettings";
import { updateSettings } from "@/lib/settings";
import {
  applyImport,
  buildExport,
  downloadExport,
} from "@/lib/exportImport";
import { SyncSection } from "./SyncSection";

export function SettingsPanel() {
  const open = useUIStore((s) => s.settingsOpen);
  const close = useUIStore((s) => s.closeSettings);
  const wipeOpen = useUIStore((s) => s.wipeAllOpen);
  const isMobile = useIsMobile();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        if (wipeOpen) return;
        close();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, wipeOpen, close]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {isMobile && (
            <motion.div
              key="settings-backdrop"
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
            <header className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
              <div className="text-[15px] font-medium text-fg">Settings</div>
              <button
                type="button"
                onClick={close}
                aria-label="Close settings"
                className="text-fg-muted hover:text-fg transition-colors"
              >
                <X size={16} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
              <PreferencesSection />
              <SyncSection />
              <DataSection />
              <DangerSection />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function PreferencesSection() {
  const { theme, weekStartsOn } = useSettings();

  return (
    <Section title="Preferences">
      <Row label="Theme">
        <Segmented
          value={theme}
          onChange={(v) => void updateSettings({ theme: v })}
          options={[
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
        />
      </Row>
      <Row label="Week starts on">
        <Segmented
          value={String(weekStartsOn) as "0" | "1"}
          onChange={(v) =>
            void updateSettings({ weekStartsOn: v === "1" ? 1 : 0 })
          }
          options={[
            { value: "0", label: "Sunday" },
            { value: "1", label: "Monday" },
          ]}
        />
      </Row>
    </Section>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="text-[10px] uppercase tracking-wider text-fg-subtle font-medium">
        {title}
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-[13px] text-fg">{label}</div>
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="inline-flex rounded-md border border-border bg-bg p-0.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={
              "px-2.5 py-1 text-[11px] rounded transition-colors " +
              (active
                ? "bg-fg text-bg"
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

function DataSection() {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleExport() {
    setError(null);
    try {
      const file = await buildExport(APP_VERSION);
      downloadExport(file);
      setStatus(
        `Exported ${file.projects.length} project${file.projects.length === 1 ? "" : "s"}, ${file.dayNotes.length} note${file.dayNotes.length === 1 ? "" : "s"}.`,
      );
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setStatus(null);
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    try {
      const text = await file.text();
      const result = await applyImport(text);
      const projectsTotal = result.projectsAdded + result.projectsUpdated;
      const notesTotal = result.notesAdded + result.notesUpdated;
      setStatus(
        `Imported ${projectsTotal} project${projectsTotal === 1 ? "" : "s"}, ${notesTotal} note${notesTotal === 1 ? "" : "s"}.`,
      );
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    }
  }

  return (
    <Section title="Data">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleExport}
          className="flex-1 px-3 py-2 text-xs font-medium bg-fg text-bg rounded hover:opacity-90 transition-opacity"
        >
          Export backup
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 px-3 py-2 text-xs font-medium border border-border text-fg rounded hover:bg-surface transition-colors"
        >
          Import backup
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={handleImportFile}
          className="hidden"
        />
      </div>
      {status && (
        <div className="text-[11px] text-fg-muted leading-relaxed">
          {status}
        </div>
      )}
      {error && (
        <div className="text-[11px] text-red-400 leading-relaxed">{error}</div>
      )}
    </Section>
  );
}

function DangerSection() {
  const openWipe = useUIStore((s) => s.openWipeAll);

  return (
    <section className="flex flex-col gap-3 pt-5 border-t border-border-subtle">
      <div className="text-[10px] uppercase tracking-wider text-red-400 font-medium">
        Danger zone
      </div>
      <button
        type="button"
        onClick={openWipe}
        className="self-start px-3 py-1.5 text-xs font-medium border border-red-500/40 text-red-400 rounded hover:bg-red-500/10 transition-colors"
      >
        Wipe all data
      </button>
      <div className="text-[11px] text-fg-subtle leading-relaxed">
        Deletes every project, every day note, and resets your preferences.
        Cannot be undone.
      </div>
    </section>
  );
}

const APP_VERSION = "0.4.0";
