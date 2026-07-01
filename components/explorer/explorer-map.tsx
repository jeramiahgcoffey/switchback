"use client";

/**
 * Explorer overview map — every visible trailhead as a difficulty-colored
 * diamond marker on the shared keyless-OSM LeafletMap wrapper.
 *
 * Leaflet touches `window` at import time, so this module must only ever be
 * loaded via `next/dynamic` with `ssr: false` (see trail-explorer.tsx).
 *
 * Sync contract with the card grid:
 * - `hoveredSlug` scales/glows the matching marker and pins its tooltip;
 * - hovering a marker calls `onMarkerHover(slug)` so the grid can highlight
 *   and scroll the matching card into view;
 * - clicking a marker deep-links to /trails/[slug].
 */

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Marker, Tooltip, useMap } from "react-leaflet";
import { divIcon, latLngBounds, type DivIcon } from "leaflet";
import LeafletMap from "@/components/map/leaflet-map";
import type { Difficulty } from "@/lib/types";
import type { ExplorerMarker } from "@/components/explorer/filters";

// Difficulty ramp: sage -> sand -> amber -> ember -> rust (matches the UI).
const DIFF_COLOR: Record<Difficulty, string> = {
  1: "#8A9A7B",
  2: "#D8CDBB",
  3: "#D9A441",
  4: "#E8622C",
  5: "#B3402C",
};

/** Continental-US fallback view when a shared URL filters out every trail. */
const FALLBACK_CENTER: [number, number] = [39.6, -104.9];
const FALLBACK_ZOOM = 4;

const iconCache = new Map<string, DivIcon>();

/** Ski-diamond divIcon in the difficulty color; `active` = hovered card/marker. */
function diamondIcon(difficulty: Difficulty, active: boolean): DivIcon {
  const key = `${difficulty}-${active ? "on" : "off"}`;
  const cached = iconCache.get(key);
  if (cached) return cached;
  const color = DIFF_COLOR[difficulty];
  const size = active ? 26 : 18;
  const icon = divIcon({
    className: "sb-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    tooltipAnchor: [0, -(size / 2 + 4)],
    html: `<span class="sb-marker-diamond${active ? " sb-marker-diamond--active" : ""}" style="background:${color};"></span>`,
  });
  iconCache.set(key, icon);
  return icon;
}

/** Tiny dim dot for trails the current filters exclude — context, not targets. */
function contextIcon(difficulty: Difficulty): DivIcon {
  const key = `ctx-${difficulty}`;
  const cached = iconCache.get(key);
  if (cached) return cached;
  const icon = divIcon({
    className: "sb-marker",
    iconSize: [8, 8],
    iconAnchor: [4, 4],
    html: `<span class="sb-marker-dot" style="background:${DIFF_COLOR[difficulty]};"></span>`,
  });
  iconCache.set(key, icon);
  return icon;
}

/** flyToBounds whenever the filtered set changes (skips the initial fit). */
function FitToMarkers({ markers }: { markers: ExplorerMarker[] }) {
  const map = useMap();
  const boundsKey = markers.map((m) => m.slug).join("|");
  const prevKey = useRef<string | null>(null);

  useEffect(() => {
    if (prevKey.current === boundsKey) return;
    const isFirst = prevKey.current === null;
    prevKey.current = boundsKey;
    if (isFirst || markers.length === 0) return;
    map.flyToBounds(
      latLngBounds(markers.map((m) => [m.lat, m.lng] as [number, number])),
      { padding: [56, 56], maxZoom: 9, duration: 0.9 },
    );
  }, [boundsKey, map, markers]);

  return null;
}

export interface ExplorerMapProps {
  /** Trails matching the active filters — interactive markers. */
  matched: ExplorerMarker[];
  /** Filtered-out trails — rendered as faint, non-interactive context dots. */
  dimmed: ExplorerMarker[];
  hoveredSlug: string | null;
  onMarkerHover: (slug: string | null) => void;
}

export default function ExplorerMap({
  matched,
  dimmed,
  hoveredSlug,
  onMarkerHover,
}: ExplorerMapProps) {
  const router = useRouter();

  // Initial view only — MapContainer ignores bounds/center after mount;
  // FitToMarkers owns every subsequent move.
  const initialBounds = useMemo(
    () =>
      matched.length
        ? latLngBounds(matched.map((m) => [m.lat, m.lng] as [number, number])).pad(0.12)
        : undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div className="relative h-full w-full">
      {/* Marker + tooltip styling scoped to this feature (globals.css is shared). */}
      <style>{`
        .sb-marker { background: transparent; border: none; }
        .sb-marker-diamond {
          position: absolute; inset: 2px; display: block;
          transform: rotate(45deg); border-radius: 2px;
          border: 1.5px solid rgb(16 18 21 / 0.9);
          box-shadow: 0 2px 6px rgb(0 0 0 / 0.5);
        }
        .sb-marker-diamond--active {
          border-color: #EDE6DA;
          box-shadow: 0 0 0 5px rgb(232 98 44 / 0.22), 0 4px 12px rgb(0 0 0 / 0.55);
          animation: sb-marker-pop 160ms ease-out;
        }
        @keyframes sb-marker-pop {
          from { transform: rotate(45deg) scale(0.72); }
          to { transform: rotate(45deg) scale(1); }
        }
        .sb-marker-dot {
          position: absolute; inset: 0; display: block;
          border-radius: 9999px; opacity: 0.4;
        }
        .leaflet-tooltip.sb-tooltip {
          background: #1E2126; color: #EDE6DA;
          border: 1px solid rgb(216 205 187 / 0.28); border-radius: 6px;
          box-shadow: 0 8px 20px rgb(0 0 0 / 0.45);
          padding: 6px 10px;
        }
        .leaflet-tooltip.sb-tooltip::before { display: none; }
        @media (prefers-reduced-motion: reduce) {
          .sb-marker-diamond--active { animation: none; }
        }
      `}</style>

      <LeafletMap
        bounds={initialBounds}
        center={initialBounds ? undefined : FALLBACK_CENTER}
        zoom={FALLBACK_ZOOM}
        boundsPadding={40}
        scrollWheelZoom={false}
      >
        <FitToMarkers markers={matched} />

        {dimmed.map((m) => (
          <Marker
            key={`ctx-${m.slug}`}
            position={[m.lat, m.lng]}
            icon={contextIcon(m.difficulty)}
            interactive={false}
            keyboard={false}
          />
        ))}

        {matched.map((m) => {
          const active = hoveredSlug === m.slug;
          return (
            <Marker
              key={m.slug}
              position={[m.lat, m.lng]}
              icon={diamondIcon(m.difficulty, active)}
              zIndexOffset={active ? 1000 : 0}
              alt={`${m.name} trailhead`}
              eventHandlers={{
                mouseover: () => onMarkerHover(m.slug),
                mouseout: () => onMarkerHover(null),
                click: () => router.push(`/trails/${m.slug}`),
              }}
            >
              {/* Keyed so toggling `permanent` re-registers the tooltip. */}
              <Tooltip
                key={active ? "pinned" : "hover"}
                permanent={active}
                direction="top"
                className="sb-tooltip"
              >
                <span className="block font-display text-xs font-semibold uppercase tracking-[0.1em] text-bone">
                  {m.name}
                </span>
                <span className="readout block text-[0.7rem] text-sand-dim">
                  diff {m.difficulty} · {m.distanceMiles} mi · {m.estimatedDays}d
                </span>
              </Tooltip>
            </Marker>
          );
        })}
      </LeafletMap>

      {matched.length === 0 ? (
        <div className="pointer-events-none absolute inset-x-0 top-4 z-[1000] flex justify-center">
          <p className="card-surface px-3 py-1.5 font-display text-xs font-semibold uppercase tracking-[0.12em] text-sand-dim">
            No trailheads match the current filters
          </p>
        </div>
      ) : null}
    </div>
  );
}
