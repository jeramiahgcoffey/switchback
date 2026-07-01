"use client";

/**
 * Animated packing-progress ring. The arc eases toward the current
 * percentage (CSS transition on stroke-dashoffset) and flips from ember
 * to sage when everything is packed.
 */
import styles from "./plan.module.css";
import { useCountUp } from "./use-count-up";

export function ProgressRing({
  checked,
  total,
  size = 148,
  strokeWidth = 9,
}: {
  checked: number;
  total: number;
  size?: number;
  strokeWidth?: number;
}) {
  const pct = total > 0 ? checked / total : 0;
  const displayPct = useCountUp(Math.round(pct * 100), 500);
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const complete = total > 0 && checked >= total;
  const color = complete ? "var(--color-sage)" : "var(--color-ember)";

  return (
    <div
      className="relative inline-flex items-center justify-center"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={checked}
      aria-label={`Packing progress: ${checked} of ${total} items packed`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-edge)"
          strokeWidth={strokeWidth}
        />
        <circle
          className={styles.ringProgress}
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="readout text-3xl font-semibold">
          {Math.round(displayPct)}
          <span className="text-base text-sand-dim">%</span>
        </span>
        <span className="stat-label mt-1">
          {complete ? "Packed" : `${checked} / ${total}`}
        </span>
      </div>
    </div>
  );
}
