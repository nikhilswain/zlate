"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";
import { useIsMobile } from "@/hooks/useIsMobile";

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
              {/* PreferencesSection — Task 4 */}
              {/* DataSection — Task 5 */}
              {/* DangerSection — Task 6 */}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
