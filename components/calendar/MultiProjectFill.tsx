"use client";

import { motion } from "framer-motion";
import { useUIStore } from "@/store/useUIStore";
import { readableTextColor } from "@/lib/contrast";
import type { Project } from "@/types/project";

type Props = {
  projects: Project[];
  isPast: boolean;
  day: Date;
};

const MAX_PILLS = 3;
const STAGGER_PER_DAY = 0.02;

export function MultiProjectFill({ projects, isPast, day }: Props) {
  if (projects.length === 0) return null;

  const visible = projects.slice(0, MAX_PILLS);
  const extra = projects.length - visible.length;

  return (
    <div className="flex flex-col gap-0.5 mt-auto">
      {visible.map((p) => (
        <Pill key={p.id} project={p} day={day} isPast={isPast} />
      ))}
      {extra > 0 && (
        <div className="text-[10.5px] font-medium text-fg-subtle px-1.5 leading-tight">
          +{extra} more
        </div>
      )}
    </div>
  );
}

function Pill({
  project,
  day,
  isPast,
}: {
  project: Project;
  day: Date;
  isPast: boolean;
}) {
  const setSelectedProjectId = useUIStore((s) => s.setSelectedProjectId);
  const bg = project.baseColor;
  const text = readableTextColor(bg);

  const dayIndex = Math.floor(
    (day.getTime() - project.startDate.getTime()) / 86_400_000,
  );
  const delay = Math.max(0, dayIndex) * STAGGER_PER_DAY;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: isPast ? 0.6 : 1, y: 0 }}
      transition={{
        delay,
        duration: 0.32,
        ease: [0.16, 1, 0.3, 1],
      }}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedProjectId(project.id);
      }}
      className="flex items-center gap-1.5 px-1.5 rounded h-5 overflow-hidden w-full text-left transition-shadow duration-200 hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.3)]"
      style={{ background: bg, color: text }}
    >
      {project.icon ? (
        <span aria-hidden className="text-[10px] leading-none">
          {project.icon}
        </span>
      ) : (
        <span
          aria-hidden
          className="size-1.5 shrink-0 rounded-full"
          style={{ background: text, opacity: 0.55 }}
        />
      )}
      <span className="text-[10.5px] font-medium leading-none truncate">
        {project.name}
      </span>
    </motion.button>
  );
}
