"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(max-width: 767px)";

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSnapshot(): boolean {
  // Prefer the attribute set by the inline boot script in app/layout.tsx —
  // it was written before paint, so it is the canonical first-render answer.
  const attr = document.documentElement.dataset.vp;
  if (attr === "mobile") return true;
  if (attr === "desktop") return false;
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot(): boolean {
  // SSR has no viewport. We render the responsive markup unconditionally
  // (Phase 1 migrates the initial-paint branches to CSS), so this default
  // never causes a visible flicker for paint-critical components.
  return false;
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
