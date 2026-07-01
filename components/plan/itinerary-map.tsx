"use client";

/**
 * Step 2 map: route polyline split into per-day segments over the shared
 * Leaflet wrapper. Hovering a day card brightens its segment; night stops
 * are numbered diamond markers, fuel stops amber, trailhead/exit ember.
 *
 * Loaded with next/dynamic + ssr:false (Leaflet touches window on import).
 */
import { useMemo } from "react";
import L from "leaflet";
import { Marker, Polyline } from "react-leaflet";
import LeafletMap from "@/components/map/leaflet-map";
import type { DayPlan, Trail, Waypoint } from "@/lib/types";

/** Consistent stroked marker style rendered as a Leaflet divIcon. */
function diamondIcon(opts: {
  label: string;
  bg: string;
  fg: string;
  border: string;
  size?: number;
}): L.DivIcon {
  const size = opts.size ?? 24;
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;transform:rotate(45deg);background:${opts.bg};border:1.5px solid ${opts.border};border-radius:3px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgb(0 0 0 / 0.45)"><span style="transform:rotate(-45deg);font-family:var(--font-jetbrains-mono),monospace;font-size:10px;font-weight:600;color:${opts.fg};line-height:1">${opts.label}</span></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export default function ItineraryMap({
  trail,
  days,
  activeDay,
}: {
  trail: Trail;
  days: DayPlan[];
  activeDay: number | null;
}) {
  const byId = useMemo(() => {
    const m = new Map<string, Waypoint>();
    for (const w of trail.waypoints) m.set(w.id, w);
    return m;
  }, [trail]);

  const bounds = useMemo(() => {
    const lats = trail.track.map((p) => p.lat);
    const lngs = trail.track.map((p) => p.lng);
    return [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ] as [[number, number], [number, number]];
  }, [trail]);

  /** Per-day track slices, bounded by the day's start/end waypoints. */
  const segments = useMemo(
    () =>
      days.map((d) => {
        const a = byId.get(d.startWaypointId);
        const b = byId.get(d.endWaypointId);
        const i = Math.min(a?.trackIndex ?? 0, b?.trackIndex ?? 0);
        const j = Math.max(a?.trackIndex ?? 0, b?.trackIndex ?? trail.track.length - 1);
        return {
          day: d.day,
          positions: trail.track
            .slice(i, j + 1)
            .map((p) => [p.lat, p.lng] as [number, number]),
        };
      }),
    [days, byId, trail],
  );

  const icons = useMemo(() => {
    const ember = "#e8622c";
    const basaltDeep = "#101215";
    const gunmetal = "#1e2126";
    const bone = "#ede6da";
    const amber = "#d9a441";
    return {
      start: diamondIcon({ label: "S", bg: ember, fg: basaltDeep, border: ember, size: 26 }),
      end: diamondIcon({ label: "E", bg: gunmetal, fg: "#f07b49", border: ember, size: 26 }),
      fuel: diamondIcon({ label: "F", bg: gunmetal, fg: amber, border: amber, size: 22 }),
      night: (n: number) =>
        diamondIcon({ label: String(n), bg: gunmetal, fg: bone, border: "rgb(216 205 187 / 0.5)" }),
    };
  }, []);

  const startWp = byId.get(days[0]?.startWaypointId ?? "");
  const endWp = byId.get(days[days.length - 1]?.endWaypointId ?? "");
  const nightWps = days
    .filter((d) => d.campWaypointId)
    .map((d) => ({ day: d.day, wp: byId.get(d.campWaypointId!) }));
  const fuelWps = trail.waypoints.filter((w) => w.kind === "fuel");

  return (
    <LeafletMap bounds={bounds} boundsPadding={32} scrollWheelZoom={false}>
      {segments.map((s) => {
        const active = activeDay === null || activeDay === s.day;
        return (
          <Polyline
            key={`${trail.slug}-day-${s.day}-${segments.length}`}
            positions={s.positions}
            pathOptions={{
              color: activeDay === s.day ? "#f07b49" : "#e8622c",
              weight: activeDay === s.day ? 5 : 3,
              opacity: active ? 0.95 : 0.35,
              lineCap: "round",
            }}
          />
        );
      })}
      {fuelWps.map((w) => (
        <Marker
          key={w.id}
          position={[w.lat, w.lng]}
          icon={icons.fuel}
          title={`${w.name}: fuel`}
        />
      ))}
      {nightWps.map(
        ({ day, wp }) =>
          wp && (
            <Marker
              key={wp.id}
              position={[wp.lat, wp.lng]}
              icon={icons.night(day)}
              title={`Night ${day}: ${wp.name}`}
            />
          ),
      )}
      {startWp && (
        <Marker
          position={[startWp.lat, startWp.lng]}
          icon={icons.start}
          title={`Start: ${startWp.name}`}
        />
      )}
      {endWp && endWp.id !== startWp?.id && (
        <Marker
          position={[endWp.lat, endWp.lng]}
          icon={icons.end}
          title={`End: ${endWp.name}`}
        />
      )}
    </LeafletMap>
  );
}
