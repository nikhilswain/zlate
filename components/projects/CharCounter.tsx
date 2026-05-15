"use client";

type Props = {
  count: number;
  max: number;
};

const RADIUS = 8;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CharCounter({ count, max }: Props) {
  const ratio = Math.min(count / max, 1);
  const remaining = max - count;
  const isOver = count > max;
  const isClose = remaining <= 20;

  const stroke = isOver
    ? "#ef4444"
    : isClose
      ? "#f59e0b"
      : "rgba(154, 154, 154, 0.7)";

  const offset = CIRCUMFERENCE - ratio * CIRCUMFERENCE;

  return (
    <div
      className="flex items-center gap-1.5"
      aria-label={`${count} of ${max} characters used`}
    >
      {isClose && (
        <span
          className={
            "text-[10px] tabular-nums font-medium " +
            (isOver ? "text-red-500" : "text-amber-500")
          }
        >
          {remaining}
        </span>
      )}
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        aria-hidden
        className="shrink-0"
      >
        <circle
          cx="10"
          cy="10"
          r={RADIUS}
          stroke="var(--border)"
          strokeWidth="1.75"
          fill="none"
        />
        <circle
          cx="10"
          cy="10"
          r={RADIUS}
          stroke={stroke}
          strokeWidth="1.75"
          fill="none"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 10 10)"
          style={{
            transition: "stroke 0.15s ease-out, stroke-dashoffset 0.15s ease-out",
          }}
        />
      </svg>
    </div>
  );
}
