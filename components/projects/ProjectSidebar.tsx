"use client";

import { format } from "date-fns";
import { useProjects } from "@/hooks/useProjects";
import { useUIStore } from "@/store/useUIStore";
import { ThemeToggle } from "@/components/shell/ThemeToggle";

export function ProjectSidebar() {
  const projects = useProjects();
  const focused = useUIStore((s) => s.focusedProjectIds);
  const toggleFocus = useUIStore((s) => s.toggleFocus);
  const clearFocus = useUIStore((s) => s.clearFocus);

  const hasFocus = focused.size > 0;

  return (
    <aside className="w-[260px] shrink-0 flex flex-col border-r border-border-subtle bg-surface">
      <header className="flex items-center justify-between px-5 py-4">
        <span className="text-base font-medium tracking-tight text-fg">
          Zlate
        </span>
        <ThemeToggle />
      </header>

      <div className="flex-1 overflow-y-auto px-3 pb-6">
        <div className="px-2 mb-2 flex items-center justify-between">
          <span className="text-[10.5px] uppercase tracking-wider font-medium text-fg-subtle">
            Projects
          </span>
          {hasFocus && (
            <button
              type="button"
              onClick={clearFocus}
              className="text-[10.5px] text-fg-subtle hover:text-fg transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {projects.length === 0 ? (
          <div className="px-2 py-4 text-xs text-fg-muted leading-relaxed">
            Click any day to start a project.
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {projects.map((p) => {
              const isFocused = focused.has(p.id);
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => toggleFocus(p.id)}
                    aria-pressed={isFocused}
                    className={
                      "group w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-left transition-colors " +
                      (isFocused
                        ? "bg-fg/[0.08]"
                        : hasFocus
                          ? "opacity-50 hover:opacity-100 hover:bg-surface-elevated"
                          : "hover:bg-surface-elevated")
                    }
                  >
                    <span
                      aria-hidden
                      className="size-2.5 rounded-full shrink-0"
                      style={{ background: p.baseColor }}
                    />
                    {p.icon && (
                      <span aria-hidden className="text-sm leading-none">
                        {p.icon}
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] text-fg truncate font-medium leading-tight">
                        {p.name}
                      </div>
                      <div className="text-[10.5px] text-fg-subtle truncate leading-tight mt-0.5">
                        {format(p.startDate, "MMM d")} – {format(p.endDate, "MMM d")}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
