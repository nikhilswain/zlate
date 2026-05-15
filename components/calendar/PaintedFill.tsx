"use client";

import { motion } from "framer-motion";
import { useUIStore } from "@/store/useUIStore";
import type { Project } from "@/types/project";

type Props = {
  projects: Project[];
  isPast: boolean;
  day: Date;
};

const MAX_BANDS = 6;
const STAGGER_PER_DAY = 0.02;

export function PaintedFill({ projects, isPast, day }: Props) {
  if (projects.length === 0) return null;

  const showOverflow = projects.length > MAX_BANDS;
  const visible = showOverflow
    ? projects.slice(0, MAX_BANDS - 1)
    : projects.slice(0, MAX_BANDS);
  const extra = showOverflow ? projects.length - visible.length : 0;

  return (
    <div className="absolute inset-0 flex flex-col">
      {visible.map((p) => (
        <Band key={p.id} project={p} day={day} isPast={isPast} />
      ))}
      {showOverflow && (
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="h-3 bg-fg-subtle/30 text-fg-muted text-[9px] font-medium flex items-center justify-center hover:bg-fg-subtle/50 transition-colors"
        >
          +{extra}
        </button>
      )}
    </div>
  );
}

function Band({
  project,
  day,
  isPast,
}: {
  project: Project;
  day: Date;
  isPast: boolean;
}) {
  const setSelectedProjectId = useUIStore((s) => s.setSelectedProjectId);

  const dayIndex = Math.floor(
    (day.getTime() - project.startDate.getTime()) / 86_400_000,
  );
  const delay = Math.max(0, dayIndex) * STAGGER_PER_DAY;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0 }}
      animate={{ opacity: isPast ? 0.6 : 1 }}
      transition={{
        delay,
        duration: 0.32,
        ease: [0.16, 1, 0.3, 1],
      }}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedProjectId(project.id);
      }}
      aria-label={project.name}
      className="block w-full flex-1 min-h-0 transition-shadow duration-200 hover:shadow-[inset_0_0_0_2px_rgba(255,255,255,0.25)]"
      style={{ background: project.baseColor }}
    />
  );
}
