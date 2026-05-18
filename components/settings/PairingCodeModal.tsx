"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";
import { useIsMobile } from "@/hooks/useIsMobile";
import { redeemPairingCode, syncNow, SyncError } from "@/lib/sync";

export function PairingCodeModal() {
  const open = useUIStore((s) => s.pairingCodeModalOpen);

  return (
    <AnimatePresence>
      {open && <ModalInner key="pairing-code-modal" />}
    </AnimatePresence>
  );
}

function ModalInner() {
  const close = useUIStore((s) => s.closePairingCodeModal);
  const isMobile = useIsMobile();

  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, []);

  const trimmed = code.trim().toUpperCase().replace(/[\s-]/g, "");
  const canSubmit = trimmed.length >= 4 && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await redeemPairingCode(trimmed);
      // Auto-sync so the user sees their data immediately. Best-effort:
      // pairing already succeeded; a sync failure here shouldn't block close.
      try {
        await syncNow();
      } catch (syncErr) {
        console.error("[sync] post-pair sync failed", syncErr);
      }
      close();
    } catch (err) {
      const message =
        err instanceof SyncError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to redeem code.";
      setError(message);
      setSubmitting(false);
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={close}
        className="fixed inset-0 z-50 bg-overlay backdrop-blur-sm"
      />
      <motion.div
        role="dialog"
        aria-label="Enter pairing code"
        initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.96, y: 8 }}
        animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
        exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: isMobile ? 0.28 : 0.2, ease: [0.16, 1, 0.3, 1] }}
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
          <div className="text-sm font-medium text-fg">Enter pairing code</div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="text-fg-muted hover:text-fg transition-colors"
          >
            <X size={14} />
          </button>
        </header>
        <div className="p-5 flex flex-col gap-3">
          <div className="text-[13px] text-fg-muted leading-relaxed">
            Enter the 6-character code shown on your other device. Codes expire
            after 5 minutes.
          </div>
          <input
            ref={inputRef}
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canSubmit) {
                e.preventDefault();
                void handleSubmit();
              }
            }}
            placeholder="A3B7K9"
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="characters"
            className="bg-bg border border-border rounded-md px-3 py-2 text-base font-mono tracking-widest text-fg placeholder:text-fg-subtle focus:outline-none focus:border-fg-muted transition-colors uppercase"
          />
          {error && (
            <div className="text-[11px] text-red-400 leading-relaxed">
              {error}
            </div>
          )}
        </div>
        <footer className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-border-subtle">
          <button
            type="button"
            onClick={close}
            className="px-3 py-1.5 text-xs text-fg-muted hover:text-fg rounded transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-3 py-1.5 text-xs font-medium bg-fg text-bg rounded disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {submitting ? "Connecting…" : "Connect"}
          </button>
        </footer>
      </motion.div>
    </>
  );
}
