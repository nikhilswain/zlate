"use client";

import { useEffect } from "react";
import { useSettings } from "@/hooks/useSettings";

export function ThemeApplier() {
  const { theme } = useSettings();
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return null;
}
