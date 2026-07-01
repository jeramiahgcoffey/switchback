"use client";

/**
 * Shared Leaflet wrapper: keyless OSM tiles with the app's warm-dusk tile
 * grade. Feature components add their own layers (markers, polylines) as
 * children using react-leaflet primitives.
 *
 * IMPORTANT: Leaflet touches `window` at import time, so always load this
 * component with `next/dynamic` and `ssr: false` from a client component:
 *
 *   const LeafletMap = dynamic(() => import("@/components/map/leaflet-map"), {
 *     ssr: false,
 *   });
 *
 * The map fills its parent. Give the parent an explicit height.
 */

import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";
import type { ReactNode } from "react";

export interface LeafletMapProps {
  center?: LatLngExpression;
  zoom?: number;
  bounds?: LatLngBoundsExpression;
  /** Padding (px) applied when fitting `bounds`. */
  boundsPadding?: number;
  scrollWheelZoom?: boolean;
  className?: string;
  children?: ReactNode;
}

export default function LeafletMap({
  center,
  zoom = 8,
  bounds,
  boundsPadding = 24,
  scrollWheelZoom = true,
  className = "",
  children,
}: LeafletMapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      bounds={bounds}
      boundsOptions={{ padding: [boundsPadding, boundsPadding] }}
      scrollWheelZoom={scrollWheelZoom}
      className={`h-full w-full ${className}`}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        className="map-tiles-dark"
      />
      {children}
    </MapContainer>
  );
}
