"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";
import { useIsMobile } from "@/hooks/useIsMobile";
import { wipeAllData } from "@/lib/exportImport";

const CONFIRM_PHRASE = "wipe all data";

export function WipeAllDataModal() {
  const open = useUIStore((s) => s.wipeAllOpen);

  return (
    <AnimatePresence>
      {open && <ModalInner key="wipe-modal" />}
    </AnimatePresence>
  );
}

function ModalInner() {
  const cancel = useUIStore((s) => s.cancelWipeAll);
  const closeSettings = useUIStore((s) => s.closeSettings);
  const clearFocus = useUIStore((s) => s.clearFocus);
  const setSelectedProjectId = useUIStore((s) => s.setSelectedProjectId);
  const closeDayNote = useUIStore((s) => s.closeDayNote);
  const isMobile = useIsMobile();

  const [confirm, setConfirm] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, []);

  const canWipe = confirm === CONFIRM_PHRASE;

  async function handleWipe() {
    if (!canWipe) return;
    clearFocus();
    setSelectedProjectId(null);
    closeDayNote();
    await wipeAllData();
    cancel();
    closeSettings();
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={cancel}
        className="fixed inset-0 z-50 bg-overlay backdrop-blur-sm"
      />
      <motion.div
        role="dialog"
        aria-label="Confirm wipe all data"
        initial={
          isMobile ? { y: "100%" } : { opacity: 0, scale: 0.96, y: 8 }
        }
        animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
        exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.96, y: 8 }}
        transition={{
          duration: isMobile ? 0.28 : 0.2,
          ease: [0.16, 1, 0.3, 1],
        }}
        className={
          isMobile
            ? "fixed bottom-0 left-0 right-0 z-50 bg-surface-elevated border-t border-border rounded-t-2xl shadow-2xl"
            : "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[400px] max-w-[90vw] bg-surface-elevated border border-border rounded-lg shadow-2xl"
        }
      >
        {isMobile && (
          <div className="flex justify-center pt-2 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-fg-subtle/40" />
          </div>
        )}
        <header className="flex items-center justify-between px-5 py-3.5 border-b border-border-subtle">
          <div className="text-sm font-medium text-red-400">Wipe all data</div>
          <button
            type="button"
            onClick={cancel}
            aria-label="Close"
            className="text-fg-muted hover:text-fg transition-colors"
          >
            <X size={14} />
          </button>
        </header>
        <div className="p-5 flex flex-col gap-3">
          <div className="text-[13px] text-fg-muted leading-relaxed">
            This deletes every project, every day note, and resets your
            preferences. This cannot be undone. Type{" "}
            <span className="font-medium text-fg">{CONFIRM_PHRASE}</span> to
            confirm.
          </div>
          <input
            ref={inputRef}
            type="text"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onPaste={(e) => e.preventDefault()}
            onDrop={(e) => e.preventDefault()}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canWipe) {
                e.preventDefault();
                void handleWipe();
              }
            }}
            placeholder={CONFIRM_PHRASE}
            spellCheck={false}
            autoComplete="off"
            className="bg-bg border border-border rounded-md px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:border-fg-muted transition-colors"
          />
        </div>
        <footer className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-border-subtle">
          <button
            type="button"
            onClick={cancel}
            className="px-3 py-1.5 text-xs text-fg-muted hover:text-fg rounded transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleWipe}
            disabled={!canWipe}
            className="px-3 py-1.5 text-xs font-medium bg-red-500 text-white rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-600 transition-colors"
          >
            Wipe all data
          </button>
        </footer>
      </motion.div>
    </>
  );
}
