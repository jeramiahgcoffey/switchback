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

type ElevationCache = Record<string, number>; // key -> meters

const keyOf = (p: LatLng) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;

function loadCache(): ElevationCache {
  if (!existsSync(CACHE_FILE)) return {};
  return JSON.parse(readFileSync(CACHE_FILE, "utf8")) as ElevationCache;
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
    const locations = chunk.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join("|");
    const res = await fetchJson<OtdResponse>(`${API}?locations=${locations}`);
    if (res.status !== "OK") throw new Error(`Open Topo Data status: ${res.status}`);
    for (const r of res.results) {
      cache[`${r.location.lat.toFixed(5)},${r.location.lng.toFixed(5)}`] =
        r.elevation ?? 0;
    }
    writeFileSync(CACHE_FILE, JSON.stringify(cache));
    if (i + BATCH < unique.length) await sleep(1100); // stay under 1 req/s
  }

  return points.map((p) => {
    const meters = cache[keyOf(p)];
    if (meters === undefined) throw new Error(`No elevation for ${keyOf(p)}`);
    return Math.round(meters * M_TO_FT);
  });
}
