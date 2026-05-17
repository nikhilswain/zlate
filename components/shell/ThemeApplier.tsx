"use client";

import { useEffect } from "react";
import { useSettings } from "@/hooks/useSettings";

export function ThemeApplier() {
  const { theme } = useSettings();
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("zlate.theme", theme);
    } catch {
      // ignore quota / privacy-mode errors
    }
  }, [theme]);
  return null;
}
