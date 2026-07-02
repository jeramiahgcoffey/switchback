/**
 * Elevation enrichment via Open Topo Data (https://www.opentopodata.org/),
 * ned10m dataset (USGS NED 10m, public domain).
 *
 * Public API limits: max 100 locations per request, 1 request per second,
 * 1000 requests per day. Every looked-up point is cached on disk so reruns
 * cost zero quota.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { LatLng } from "./pipeline-types.ts";
import { CACHE_DIR, fetchJson, sleep } from "./util.ts";

const API = "https://api.opentopodata.org/v1/ned10m";
const BATCH = 100;
const CACHE_FILE = join(CACHE_DIR, "elevations.json");
const M_TO_FT = 3.28084;

interface OtdResponse {
  status: string;
  results: { elevation: number | null; location: { lat: number; lng: number } }[];
}

// key -> meters, or null for a DEM void (no data at that point). Nulls are
// cached too so we don't re-request known voids, then interpolated per track.
type ElevationCache = Record<string, number | null>;

const keyOf = (p: LatLng) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;

function loadCache(): ElevationCache {
  if (!existsSync(CACHE_FILE)) return {};
  return JSON.parse(readFileSync(CACHE_FILE, "utf8")) as ElevationCache;
}

/**
 * Fill null entries (DEM voids) by linear interpolation from the nearest
 * valid neighbors along the ordered track. A void never becomes a fake 0 ft
 * sea-level spike; edges clamp to the nearest reading. Throws only if the
 * whole track is void.
 */
function interpolateVoids(metersByPoint: (number | null)[]): number[] {
  if (metersByPoint.every((m) => m === null)) {
    throw new Error("Elevation lookup returned no valid data for the entire track");
  }
  const out = metersByPoint.slice();
  for (let i = 0; i < out.length; i++) {
    if (out[i] !== null) continue;
    let lo = i - 1;
    while (lo >= 0 && out[lo] === null) lo--;
    let hi = i + 1;
    while (hi < out.length && out[hi] === null) hi++;
    const loVal = lo >= 0 ? (out[lo] as number) : null;
    const hiVal = hi < out.length ? (out[hi] as number) : null;
    if (loVal !== null && hiVal !== null) {
      out[i] = loVal + ((hiVal - loVal) * (i - lo)) / (hi - lo);
    } else {
      out[i] = (loVal ?? hiVal) as number;
    }
  }
  return out as number[];
}

/** Elevations in feet for each point, ordered like the input. */
export async function getElevationsFt(points: LatLng[]): Promise<number[]> {
  mkdirSync(CACHE_DIR, { recursive: true });
  const cache = loadCache();
  const missing = points.filter((p) => cache[keyOf(p)] === undefined);
  // Dedupe within the batch (routes can revisit a junction).
  const unique = [...new Map(missing.map((p) => [keyOf(p), p])).values()];

  for (let i = 0; i < unique.length; i += BATCH) {
    const chunk = unique.slice(i, i + BATCH);
    const locations = chunk.map(keyOf).join("|");
    const res = await fetchJson<OtdResponse>(`${API}?locations=${locations}`);
    if (res.status !== "OK") throw new Error(`Open Topo Data status: ${res.status}`);
    for (const r of res.results) {
      // Preserve a genuine void as null; do not coerce to 0 (that would read
      // as a sea-level cliff on an inland trail and pass the range check).
      cache[keyOf(r.location)] = r.elevation;
    }
    writeFileSync(CACHE_FILE, JSON.stringify(cache));
    if (i + BATCH < unique.length) await sleep(1100); // stay under 1 req/s
  }

  const meters = points.map((p) => {
    const m = cache[keyOf(p)];
    if (m === undefined) throw new Error(`No elevation for ${keyOf(p)}`);
    return m;
  });
  return interpolateVoids(meters).map((m) => Math.round(m * M_TO_FT));
}
