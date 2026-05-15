"use client";

import { Moon, Sun } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { updateSettings } from "@/lib/settings";

export function ThemeToggle() {
  const { theme } = useSettings();
  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => void updateSettings({ theme: next })}
      aria-label={`Switch to ${next} theme`}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-fg-muted transition-colors hover:bg-surface hover:text-fg"
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
