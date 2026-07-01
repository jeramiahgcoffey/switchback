import type { WaypointKind } from "@/lib/types";
import type { BadgeTone } from "@/components/ui/badge";

/**
 * One consistent stroked icon style for every waypoint kind, used as React
 * markup in the timeline and as raw SVG strings inside Leaflet divIcons so
 * the map and the route log always read the same.
 */

export interface WaypointMeta {
  label: string;
  /** Ring/accent color (hex, must also work inside Leaflet divIcon HTML). */
  color: string;
  tone: BadgeTone;
  /** Inner glyph markup, drawn on a 24x24 grid, stroke-only. */
  glyph: string;
}

export const WAYPOINT_META: Record<WaypointKind, WaypointMeta> = {
  trailhead: {
    label: "Trailhead",
    color: "#E8622C",
    tone: "ember",
    glyph:
      '<path d="M7 20V4.5"/><path d="M7 5h9.5l-2.4 3 2.4 3H7"/>',
  },
  campsite: {
    label: "Campsite",
    color: "#8A9A7B",
    tone: "sage",
    glyph:
      '<path d="M3.5 19h17"/><path d="M12 5 4.5 19"/><path d="m12 5 7.5 14"/><path d="m9.3 19 2.7-5.2L14.7 19"/>',
  },
  fuel: {
    label: "Fuel",
    color: "#D9A441",
    tone: "amber",
    glyph:
      '<path d="M5.5 19.5V6a1.8 1.8 0 0 1 1.8-1.8h3.9A1.8 1.8 0 0 1 13 6v13.5"/><path d="M4 19.5h10.5"/><path d="M7.2 7.4h4.2v3.8H7.2z"/><path d="M13 10.6h1.6a1.5 1.5 0 0 1 1.5 1.5v3.6a1.35 1.35 0 0 0 2.7 0V9.4L16.6 7.2"/>',
  },
  water: {
    label: "Water",
    color: "#7FA9BF",
    tone: "neutral",
    glyph:
      '<path d="M12 3.8c3.6 4.3 5.6 7.2 5.6 9.9a5.6 5.6 0 1 1-11.2 0c0-2.7 2-5.6 5.6-9.9Z"/><path d="M9.3 13.6a2.9 2.9 0 0 0 2 3.3"/>',
  },
  viewpoint: {
    label: "Viewpoint",
    color: "#D8CDBB",
    tone: "sand",
    glyph:
      '<path d="M2.8 12S6.5 6.8 12 6.8 21.2 12 21.2 12 17.5 17.2 12 17.2 2.8 12 2.8 12Z"/><circle cx="12" cy="12" r="2.6"/>',
  },
  obstacle: {
    label: "Obstacle",
    color: "#D05A44",
    tone: "rust",
    glyph:
      '<path d="M12 4.2 2.8 19.8h18.4L12 4.2Z"/><path d="M12 10.2v4"/><path d="M12 16.9v.2"/>',
  },
  bailout: {
    label: "Bailout",
    color: "#A69D8B",
    tone: "neutral",
    glyph:
      '<path d="M6 20v-8.5A5.5 5.5 0 0 1 11.5 6H18"/><path d="m14.5 2.8 3.5 3.2-3.5 3.2"/>',
  },
  exit: {
    label: "Exit",
    color: "#F07B49",
    tone: "ember",
    glyph:
      '<path d="M7 20V4.5"/><path d="M7 5h10v6H7"/><path d="M10.3 5v6"/><path d="M13.6 5v6"/>',
  },
};

/** Full SVG markup for a waypoint badge, safe for Leaflet divIcon `html`. */
export function waypointIconSvg(kind: WaypointKind, size = 28): string {
  const meta = WAYPOINT_META[kind];
  return `<svg width="${size}" height="${size}" viewBox="0 0 28 28" role="img" aria-label="${meta.label}" xmlns="http://www.w3.org/2000/svg">
  <circle cx="14" cy="14" r="12.4" fill="#1E2126" stroke="${meta.color}" stroke-width="1.7"/>
  <g transform="translate(5.6 5.6) scale(0.7)" fill="none" stroke="#EDE6DA" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">${meta.glyph}</g>
</svg>`;
}

/**
 * React wrapper around the same markup for use in the waypoint timeline.
 * Safety: the injected HTML is produced solely from the hardcoded
 * `WAYPOINT_META` constants above. No user or runtime data ever flows in.
 */
export function WaypointIcon({
  kind,
  size = 28,
  className = "",
}: {
  kind: WaypointKind;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`inline-block leading-none ${className}`}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: waypointIconSvg(kind, size) }}
    />
  );
}
