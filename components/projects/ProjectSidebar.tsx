"use client";

import { useState } from "react";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { useSettings } from "@/hooks/useSettings";
import { useUIStore } from "@/store/useUIStore";
import { updateSettings } from "@/lib/settings";
import { readableTextColor } from "@/lib/contrast";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import type { Project } from "@/types/project";

const EXPANDED_WIDTH = 260;
const RAIL_WIDTH = 56;

export function ProjectSidebar() {
  const projects = useProjects();
  const { sidebarCollapsed } = useSettings();
  const focused = useUIStore((s) => s.focusedProjectIds);
  const toggleFocus = useUIStore((s) => s.toggleFocus);
  const clearFocus = useUIStore((s) => s.clearFocus);
  const askDeleteProject = useUIStore((s) => s.askDeleteProject);
  const setSelectedProjectId = useUIStore((s) => s.setSelectedProjectId);

  const hasFocus = focused.size > 0;

  function toggleCollapsed() {
    void updateSettings({ sidebarCollapsed: !sidebarCollapsed });
  }

  return (
    <aside
      className="shrink-0 flex flex-col border-r border-border-subtle bg-surface overflow-hidden"
      style={{
        width: sidebarCollapsed ? RAIL_WIDTH : EXPANDED_WIDTH,
        transition: "width 320ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {sidebarCollapsed ? (
          <RailLayout
            key="rail"
            projects={projects}
            focused={focused}
            hasFocus={hasFocus}
            toggleFocus={toggleFocus}
            clearFocus={clearFocus}
            onExpand={toggleCollapsed}
          />
        ) : (
          <ExpandedLayout
            key="expanded"
            projects={projects}
            focused={focused}
            hasFocus={hasFocus}
            toggleFocus={toggleFocus}
            clearFocus={clearFocus}
            askDeleteProject={askDeleteProject}
            setSelectedProjectId={setSelectedProjectId}
            onCollapse={toggleCollapsed}
          />
        )}
      </AnimatePresence>
    </aside>
  );
}

type ExpandedProps = {
  projects: Project[];
  focused: Set<string>;
  hasFocus: boolean;
  toggleFocus: (id: string) => void;
  clearFocus: () => void;
  askDeleteProject: (id: string) => void;
  setSelectedProjectId: (id: string | null) => void;
  onCollapse: () => void;
};

function ExpandedLayout({
  projects,
  focused,
  hasFocus,
  toggleFocus,
  clearFocus,
  askDeleteProject,
  setSelectedProjectId,
  onCollapse,
}: ExpandedProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="flex flex-col h-full min-w-[260px]"
    >
      <header className="flex items-center justify-between px-5 py-4">
        <span className="text-base font-medium tracking-tight text-fg">
          Zlate
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onCollapse}
            aria-label="Collapse sidebar"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-fg-muted hover:bg-surface-elevated hover:text-fg transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <ThemeToggle />
        </div>
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
                <li
                  key={p.id}
                  className={
                    "group flex items-stretch rounded-md transition-colors " +
                    (isFocused
                      ? "bg-fg/[0.08]"
                      : hasFocus
                        ? "opacity-50 hover:opacity-100 hover:bg-surface-elevated"
                        : "hover:bg-surface-elevated")
                  }
                >
                  <button
                    type="button"
                    onClick={() => toggleFocus(p.id)}
                    aria-pressed={isFocused}
                    className="flex-1 min-w-0 flex items-center gap-2.5 px-2 py-2 text-left rounded-md"
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
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProjectId(p.id);
                    }}
                    aria-label={`Project settings for ${p.name}`}
                    className="px-1.5 flex items-center text-fg-subtle hover:text-fg opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                  >
                    <Settings2 size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      askDeleteProject(p.id);
                    }}
                    aria-label={`Delete ${p.name}`}
                    className="pl-1.5 pr-2 flex items-center text-fg-subtle hover:text-red-400 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </motion.div>
  );
}

type RailProps = {
  projects: Project[];
  focused: Set<string>;
  hasFocus: boolean;
  toggleFocus: (id: string) => void;
  clearFocus: () => void;
  onExpand: () => void;
};

function RailLayout({
  projects,
  focused,
  hasFocus,
  toggleFocus,
  clearFocus,
  onExpand,
}: RailProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="flex flex-col h-full w-[56px] items-center"
    >
      <header className="py-4">
        <button
          type="button"
          onClick={onExpand}
          aria-label="Expand sidebar"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-fg-muted hover:bg-surface-elevated hover:text-fg transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </header>

      <div className="flex-1 w-full overflow-y-auto overflow-x-visible flex flex-col items-center gap-3 pt-1 pb-4">
        {hasFocus && (
          <button
            type="button"
            onClick={clearFocus}
            aria-label="Clear focus"
            className="size-9 rounded-full flex items-center justify-center text-fg-subtle border border-dashed border-border hover:border-fg-subtle hover:text-fg transition-colors"
            title="Clear focus"
          >
            <X size={14} />
          </button>
        )}
        {projects.map((p) => {
          const isFocused = focused.has(p.id);
          return (
            <RailItem
              key={p.id}
              project={p}
              isFocused={isFocused}
              dim={hasFocus && !isFocused}
              onToggle={() => toggleFocus(p.id)}
            />
          );
        })}
      </div>

      <footer className="py-4">
        <ThemeToggle />
      </footer>
    </motion.div>
  );
}

function RailItem({
  project,
  isFocused,
  dim,
  onToggle,
}: {
  project: Project;
  isFocused: boolean;
  dim: boolean;
  onToggle: () => void;
}) {
  const text = readableTextColor(project.baseColor);
  const [rect, setRect] = useState<DOMRect | null>(null);

  return (
    <div className="relative w-full flex justify-center">
      <button
        type="button"
        onClick={onToggle}
        onMouseEnter={(e) =>
          setRect(e.currentTarget.getBoundingClientRect())
        }
        onMouseLeave={() => setRect(null)}
        onFocus={(e) => setRect(e.currentTarget.getBoundingClientRect())}
        onBlur={() => setRect(null)}
        aria-pressed={isFocused}
        aria-label={project.name}
        className={
          "size-9 rounded-full flex items-center justify-center transition-all duration-200 " +
          (isFocused
            ? "ring-2 ring-fg ring-offset-2 ring-offset-surface"
            : dim
              ? "opacity-50 hover:opacity-100"
              : "hover:brightness-110")
        }
        style={{ background: project.baseColor, color: text }}
      >
        {project.icon ? (
          <span aria-hidden className="text-sm leading-none">
            {project.icon}
          </span>
        ) : null}
      </button>
      <AnimatePresence>
        {rect && <RailTooltip key={project.id} project={project} rect={rect} />}
      </AnimatePresence>
    </div>
  );
}

function RailTooltip({ project, rect }: { project: Project; rect: DOMRect }) {
  const GAP = 14;
  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        top: rect.top + rect.height / 2,
        left: rect.right + GAP,
        transform: "translateY(-50%)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, x: -4, scale: 0.96 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: -4, scale: 0.96 }}
        transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
        className="relative"
      >
        <div className="px-3 py-2 bg-surface-elevated border border-border rounded-md shadow-2xl whitespace-nowrap flex flex-col gap-1">
          <div className="text-[12px] font-medium text-fg leading-tight">
            {project.name}
          </div>
          <div className="text-[10.5px] text-fg-subtle leading-tight">
            {format(project.startDate, "MMM d")} – {format(project.endDate, "MMM d")}
          </div>
        </div>
        <div
          aria-hidden
          className="absolute top-1/2 -translate-y-1/2 -left-1 size-2 rotate-45 bg-surface-elevated border-b border-l border-border"
        />
      </motion.div>
    </div>
  );
}
