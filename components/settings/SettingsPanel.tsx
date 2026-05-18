"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useSettings } from "@/hooks/useSettings";
import { updateSettings } from "@/lib/settings";

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
              {/* DataSection — Task 5 */}
              {/* DangerSection — Task 6 */}
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
