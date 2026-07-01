"use client";

/**
 * Trail Detail map layers — route polyline (with a drawn-in animation on
 * load), typed SVG divIcon waypoint markers with rich popups, and the ghost
 * marker driven by the shared trackPosition state. Loaded with
 * `next/dynamic` + `ssr: false` from TrailDetailView because Leaflet touches
 * `window` at import time.
 */

import { useCallback, useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { Marker, Polyline, Popup, Tooltip } from "react-leaflet";
import LeafletMap from "@/components/map/leaflet-map";
import { Badge } from "@/components/ui/badge";
import { formatCoords } from "@/lib/derive";
import type { Trail, WaypointKind } from "@/lib/types";
import { WAYPOINT_META, waypointIconSvg } from "./waypoint-icons";

const KINDS = Object.keys(WAYPOINT_META) as WaypointKind[];

export interface TrailMapProps {
  trail: Trail;
  hoverIndex: number | null;
  onHoverIndex: (index: number | null) => void;
}

export default function TrailMap({ trail, hoverIndex, onHoverIndex }: TrailMapProps) {
  const positions = useMemo(
    () => trail.track.map((p) => [p.lat, p.lng] as [number, number]),
    [trail],
  );

  const icons = useMemo(() => {
    const record = {} as Record<WaypointKind, L.DivIcon>;
    for (const kind of KINDS) {
      record[kind] = L.divIcon({
        className: "sb-wpt",
        html: waypointIconSvg(kind, 30),
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -18],
      });
    }
    return record;
  }, []);

  const ghostIcon = useMemo(
    () =>
      L.divIcon({
        className: "sb-ghost",
        html: '<span class="sb-ghost-ring"></span><span class="sb-ghost-dot"></span>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      }),
    [],
  );

  // Drawn-in polyline animation on load (skipped for reduced motion).
  const lineRef = useRef<L.Polyline | null>(null);
  useEffect(() => {
    const path = lineRef.current?.getElement() as SVGPathElement | undefined;
    if (!path || typeof path.getTotalLength !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let length: number;
    try {
      length = path.getTotalLength();
    } catch {
      return;
    }
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length}`;
    // Force a reflow so the transition starts from the fully hidden state.
    path.getBoundingClientRect();
    path.style.transition = "stroke-dashoffset 1500ms ease-out";
    path.style.strokeDashoffset = "0";
    const timer = window.setTimeout(() => {
      // Clear so Leaflet re-projections (zoom/pan) render a clean line.
      path.style.strokeDasharray = "";
      path.style.strokeDashoffset = "";
      path.style.transition = "";
    }, 1700);
    return () => window.clearTimeout(timer);
  }, []);

  // Nearest track index to a hovered latlng — track is 40-80 points, so a
  // linear scan in equirectangular space is effectively free.
  const nearestToLatLng = useCallback(
    (latlng: L.LatLng): number => {
      const cosLat = Math.cos((latlng.lat * Math.PI) / 180);
      let best = 0;
      let bestDist = Infinity;
      trail.track.forEach((p, i) => {
        const dLat = p.lat - latlng.lat;
        const dLng = (p.lng - latlng.lng) * cosLat;
        const d = dLat * dLat + dLng * dLng;
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      return best;
    },
    [trail],
  );

  const hoverPoint =
    hoverIndex != null
      ? trail.track[Math.min(Math.max(hoverIndex, 0), trail.track.length - 1)]
      : null;

  return (
    <LeafletMap bounds={positions} boundsPadding={34} scrollWheelZoom={false}>
      {/* dark casing under the ember route line — GPS head-unit style */}
      <Polyline
        positions={positions}
        pathOptions={{ color: "#101215", weight: 7, opacity: 0.8, interactive: false }}
      />
      <Polyline
        ref={lineRef}
        positions={positions}
        pathOptions={{
          color: "#E8622C",
          weight: 3.5,
          opacity: 0.95,
          lineJoin: "round",
          lineCap: "round",
          interactive: false,
        }}
      />
      {/* invisible wide hit-line so hovering the route is forgiving */}
      <Polyline
        positions={positions}
        pathOptions={{ color: "#000000", opacity: 0.001, weight: 26 }}
        eventHandlers={{
          mousemove: (e) => onHoverIndex(nearestToLatLng(e.latlng)),
          mouseout: () => onHoverIndex(null),
        }}
      />

      {trail.waypoints.map((w) => {
        const meta = WAYPOINT_META[w.kind];
        const elevationFt = trail.track[w.trackIndex]?.elevationFt ?? null;
        return (
          <Marker key={w.id} position={[w.lat, w.lng]} icon={icons[w.kind]}>
            <Popup className="sb-popup" maxWidth={280} closeButton={false}>
              <div className="min-w-52">
                <div className="flex items-center justify-between gap-2">
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                  <span className="readout text-[11px] text-sand-dim">
                    MI {w.mileMarker.toFixed(1)}
                  </span>
                </div>
                <div className="heading-display mt-2 text-lg leading-tight">
                  {w.name}
                </div>
                <div className="readout mt-1 text-[11px] text-sand-dim">
                  {formatCoords(w.lat, w.lng)}
                  {elevationFt != null
                    ? ` · ${Math.round(elevationFt).toLocaleString("en-US")} FT`
                    : ""}
                </div>
                <div className="mt-2 text-xs leading-5 text-sand">
                  {w.description}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {hoverPoint ? (
        <Marker
          position={[hoverPoint.lat, hoverPoint.lng]}
          icon={ghostIcon}
          interactive={false}
          zIndexOffset={1200}
        >
          <Tooltip
            permanent
            direction="top"
            offset={[0, -12]}
            className="sb-tip"
          >
            {`MI ${hoverPoint.distanceFromStartMi.toFixed(1)} · ${Math.round(hoverPoint.elevationFt).toLocaleString("en-US")} FT`}
          </Tooltip>
        </Marker>
      ) : null}
    </LeafletMap>
  );
}
