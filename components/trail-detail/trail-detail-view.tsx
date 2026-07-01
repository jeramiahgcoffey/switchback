"use client";

/**
 * Trail Detail client shell — owns the single shared `trackPosition` state
 * (an index into trail.track) that syncs the map's ghost marker, the
 * elevation chart cursor, and the waypoint timeline highlight. Hover any of
 * the three and the other two respond.
 */

import { useState } from "react";
import nextDynamic from "next/dynamic";
import type { Trail } from "@/lib/types";
import { ElevationProfile } from "./elevation-profile";
import { WaypointTimeline } from "./waypoint-timeline";

const TrailMap = nextDynamic(() => import("./trail-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full animate-pulse items-center justify-center bg-gunmetal">
      <p className="readout text-xs text-sand-dim">ACQUIRING TILES…</p>
    </div>
  ),
});

/**
 * Dark skin for Leaflet chrome (divIcons, popups, tooltips, controls).
 * Injected here — scoped by .sb-* classes — because components/ui and
 * globals.css are shared files this feature must not edit. The string is a
 * compile-time constant; nothing dynamic is interpolated.
 */
const MAP_CSS = `
.sb-map .leaflet-container { border-radius: 7px; }
.sb-wpt { background: transparent; border: none; }
.sb-wpt svg { display: block; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.55)); transition: transform 160ms ease-out; transform-origin: 50% 50%; }
.sb-wpt:hover svg { transform: scale(1.15); }
.sb-ghost { background: transparent; border: none; pointer-events: none; }
.sb-ghost-dot { position: absolute; inset: 3px; border-radius: 9999px; background: #E8622C; border: 2px solid #EDE6DA; box-shadow: 0 0 10px rgba(232,98,44,0.9); }
.sb-ghost-ring { position: absolute; inset: -6px; border-radius: 9999px; border: 2px solid rgba(232,98,44,0.7); animation: sb-ghost-pulse 1.6s ease-out infinite; }
@keyframes sb-ghost-pulse {
  0% { transform: scale(0.55); opacity: 0.9; }
  100% { transform: scale(1.55); opacity: 0; }
}
.sb-popup .leaflet-popup-content-wrapper { background: #1E2126; color: #D8CDBB; border: 1px solid rgba(216,205,187,0.28); border-radius: 8px; box-shadow: 0 14px 36px rgba(0,0,0,0.5); }
.sb-popup .leaflet-popup-content { margin: 12px 14px; line-height: 1.5; }
.sb-popup .leaflet-popup-tip { background: #1E2126; border: 1px solid rgba(216,205,187,0.28); }
.sb-tip.leaflet-tooltip { background: #101215; color: #EDE6DA; border: 1px solid rgba(216,205,187,0.28); border-radius: 6px; padding: 3px 8px; font-family: var(--font-jetbrains-mono), monospace; font-size: 11px; letter-spacing: 0.02em; box-shadow: 0 6px 18px rgba(0,0,0,0.45); white-space: nowrap; }
.sb-tip.leaflet-tooltip-top::before { border-top-color: rgba(216,205,187,0.28); }
.sb-map .leaflet-control-attribution { background: rgba(16,18,21,0.72); color: #A69D8B; }
.sb-map .leaflet-control-attribution a { color: #D8CDBB; }
.sb-map .leaflet-bar { border: 1px solid rgba(216,205,187,0.28); box-shadow: 0 8px 20px rgba(0,0,0,0.4); }
.sb-map .leaflet-bar a { background: #1E2126; color: #EDE6DA; border-bottom: 1px solid rgba(216,205,187,0.14); }
.sb-map .leaflet-bar a:hover { background: #262B31; color: #F07B49; }
@media (prefers-reduced-motion: reduce) {
  .sb-ghost-ring { animation: none; opacity: 0; }
  .sb-wpt svg { transition: none; }
}
`;

export function TrailDetailView({ trail }: { trail: Trail }) {
  /** Shared trackPosition: index into trail.track, or null when idle. */
  const [trackPosition, setTrackPosition] = useState<number | null>(null);

  return (
    <div className="min-w-0 space-y-6">
      <style dangerouslySetInnerHTML={{ __html: MAP_CSS }} />

      <section aria-label="Route map">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="stat-label">Route map</h2>
          <p className="readout text-xs text-sand-dim">
            {trail.waypoints.length} WAYPOINTS · OSM TILES
          </p>
        </div>
        <div className="sb-map relative isolate mt-3 h-[340px] overflow-hidden rounded-lg border border-edge sm:h-[440px]">
          <TrailMap
            trail={trail}
            hoverIndex={trackPosition}
            onHoverIndex={setTrackPosition}
          />
        </div>
      </section>

      <ElevationProfile
        trail={trail}
        hoverIndex={trackPosition}
        onHoverIndex={setTrackPosition}
      />

      <WaypointTimeline
        trail={trail}
        hoverIndex={trackPosition}
        onHoverIndex={setTrackPosition}
      />
    </div>
  );
}
