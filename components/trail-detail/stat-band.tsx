"use client";

import { useEffect, useState } from "react";

/**
 * Hero stat band with count-up numbers (ease-out cubic, ~1.1s). Respects
 * prefers-reduced-motion by snapping straight to the final values.
 */

export interface TrailStat {
  label: string;
  value: number;
  unit: string;
}

export function TrailStatBand({ stats }: { stats: TrailStat[] }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Reduced motion: snap straight to the final values on the first frame.
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : 1100;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
      setProgress(1 - Math.pow(1 - p, 3));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-px sm:grid-cols-4">
      {stats.map((stat) => {
        const decimals = Number.isInteger(stat.value) ? 0 : 1;
        const shown = stat.value * progress;
        return (
          <div
            key={stat.label}
            className="flex flex-col-reverse gap-1.5 px-4 py-6 sm:px-6 sm:py-7"
          >
            {/* flex-col-reverse keeps dt->dd source order valid while the
                value renders above its label */}
            <dt className="stat-label">{stat.label}</dt>
            <dd className="readout text-2xl sm:text-3xl">
              {shown.toLocaleString("en-US", {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals,
              })}
              <span className="ml-1.5 text-sm text-sand-dim">{stat.unit}</span>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
