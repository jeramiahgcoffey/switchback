"use client";

import { useMemo } from "react";
import type { Trail } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { WAYPOINT_META, WaypointIcon } from "./waypoint-icons";

/**
 * Mile-marker waypoint timeline ("route log"). Hovering or focusing an entry
 * drives the shared trackPosition, so the ghost marker on the map and the
 * chart cursor jump to that waypoint; scrubbing the chart or map highlights
 * the nearest waypoint here in return.
 */

/** How close (mi) the scrub position must be to highlight a waypoint. */
const HIGHLIGHT_RADIUS_MI = 2.5;

export function WaypointTimeline({
  trail,
  hoverIndex,
  onHoverIndex,
}: {
  trail: Trail;
  hoverIndex: number | null;
  onHoverIndex: (index: number | null) => void;
}) {
  const sorted = useMemo(
    () => [...trail.waypoints].sort((a, b) => a.mileMarker - b.mileMarker),
    [trail],
  );

  const activeId = useMemo(() => {
    if (hoverIndex == null) return null;
    const point = trail.track[Math.min(Math.max(hoverIndex, 0), trail.track.length - 1)];
    if (!point) return null;
    let best: string | null = null;
    let bestDist = Infinity;
    for (const w of sorted) {
      const d = Math.abs(w.mileMarker - point.distanceFromStartMi);
      if (d < bestDist) {
        bestDist = d;
        best = w.id;
      }
    }
    return bestDist <= HIGHLIGHT_RADIUS_MI ? best : null;
  }, [hoverIndex, sorted, trail]);

  return (
    <section aria-label="Waypoint timeline" className="card-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="stat-label">Route log</h2>
        <p className="readout text-xs text-sand-dim">
          {sorted.length} WAYPOINTS · {trail.distanceMiles.toLocaleString("en-US")} MI
        </p>
      </div>

      <ol
        className="relative mt-4"
        onMouseLeave={() => onHoverIndex(null)}
      >
        {/* dashed "route" spine behind the icons */}
        <span
          aria-hidden
          className="absolute bottom-4 left-[20px] top-4 border-l-2 border-dashed border-edge-strong"
        />
        {sorted.map((w) => {
          const meta = WAYPOINT_META[w.kind];
          const elevationFt = trail.track[w.trackIndex]?.elevationFt ?? null;
          const active = activeId === w.id;
          return (
            <li key={w.id}>
              <div
                tabIndex={0}
                onMouseEnter={() => onHoverIndex(w.trackIndex)}
                onFocus={() => onHoverIndex(w.trackIndex)}
                onBlur={() => onHoverIndex(null)}
                className={`group relative flex gap-3 rounded-md px-1.5 py-2.5 transition-colors duration-150 ease-out ${
                  active ? "bg-gunmetal-light" : "hover:bg-gunmetal-light/60"
                }`}
              >
                <span
                  className={`relative z-10 mt-0.5 shrink-0 rounded-full transition-shadow duration-150 ${
                    active ? "shadow-[0_0_0_3px_rgba(232,98,44,0.45)]" : ""
                  }`}
                >
                  <WaypointIcon kind={w.kind} size={30} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span
                      className={`readout text-xs ${active ? "text-ember-bright" : "text-sand-dim"}`}
                    >
                      MI {w.mileMarker.toFixed(1)}
                    </span>
                    <span className="font-display text-base font-semibold uppercase tracking-[0.06em] text-bone">
                      {w.name}
                    </span>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                    {elevationFt != null ? (
                      <span className="readout ml-auto text-[11px] text-sand-dim">
                        {Math.round(elevationFt).toLocaleString("en-US")} FT
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-sand-dim">
                    {w.description}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
