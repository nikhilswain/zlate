"use client";

import { formatProjectStatus, getProjectProgress } from "@/lib/projectProgress";

type Props = {
  start: Date;
  end: Date;
  color: string;
};

// Status line + thin time-progress bar shown under the project name in settings.
// The bar fills in the project's own color so it reads as "this project's" progress.
export function ProjectProgressSummary({ start, end, color }: Props) {
  const progress = getProjectProgress(start, end);

  return (
    <div className="mt-1.5 flex flex-col gap-1.5">
      <div className="text-[11px] text-fg-muted leading-tight">
        {formatProjectStatus(progress)}
      </div>
      <div className="flex items-center gap-2">
        <div className="h-[5px] flex-1 rounded-full bg-border-subtle overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-500 ease-out-expo"
            style={{ width: `${progress.percent}%`, background: color }}
          />
        </div>
        <span className="text-[10px] tabular-nums text-fg-subtle shrink-0">
          {progress.percent}%
        </span>
      </div>
    </div>
  );
}
