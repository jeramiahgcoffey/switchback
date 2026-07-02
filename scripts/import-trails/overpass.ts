/**
 * OpenStreetMap source via the Overpass API, for routes on BLM/NPS land the
 * MVUM cannot cover (Moab canyon country).
 *
 * LICENSE: OSM data is ODbL. Derived trails must carry the attribution
 * "(c) OpenStreetMap contributors" and the derived database is share-alike.
 * The emitter stamps provenance on every OSM-derived trail.
 */
import type { RegionConfig, RouteCandidate } from "./pipeline-types.ts";
import { chainUnordered, polylineMiles } from "./geo.ts";
import { cachedFetchJson, slugify } from "./util.ts";

/** Public instances, tried in order; all are rate-limited shared services. */
const MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

/** OSM ways can fragment finely; allow small gaps at junction snapping. */
const GAP_TOLERANCE_MI = 0.3;

interface OverpassWay {
  type: "way";
  id: number;
  tags?: Record<string, string>;
  geometry?: { lat: number; lon: number }[];
}

interface OverpassResponse {
  elements: OverpassWay[];
  /** Overpass reports timeouts/errors here with an HTTP 200 body. */
  remark?: string;
}

/**
 * Reject soft errors: Overpass returns HTTP 200 with an empty `elements`
 * array and a `remark` (e.g. "runtime error: Query timed out") when a mirror
 * is overloaded. Without this guard that empty body would be cached and stick
 * across runs, and the mirror fallback (which only advances on a throw) would
 * be bypassed, silently emptying the catalog for this region.
 */
function isUsableOverpass(data: OverpassResponse): boolean {
  if (data.remark && /error|timed out|timeout/i.test(data.remark)) return false;
  return Array.isArray(data.elements) && data.elements.length > 0;
}

function buildQuery(bbox: [number, number, number, number]): string {
  const b = bbox.join(",");
  // Named driveable ways only; classification happens in code where we can
  // whitelist famous routes regardless of tagging style.
  return `[out:json][timeout:180];
(
  way["highway"~"^(track|unclassified|road|residential|service)$"]["name"](${b});
);
out geom tags;`;
}

async function fetchOverpass(
  bbox: [number, number, number, number],
  refresh: boolean,
): Promise<OverpassResponse> {
  const body = "data=" + encodeURIComponent(buildQuery(bbox));
  let lastErr: unknown;
  for (const mirror of MIRRORS) {
    try {
      return await cachedFetchJson<OverpassResponse>(
        "overpass",
        mirror,
        {
          method: "POST",
          body,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        },
        refresh,
        isUsableOverpass,
      );
    } catch (err) {
      lastErr = err;
      console.warn(`  overpass mirror failed (${new URL(mirror).host}), trying next`);
    }
  }
  throw lastErr;
}

/** Keep ways that read as 4x4 routes, not neighborhood streets. */
function isCandidateWay(tags: Record<string, string>, whitelisted: boolean): boolean {
  if (whitelisted) return true;
  if (tags["4wd_only"] === "yes") return true;
  if (tags.highway === "track" && tags.motor_vehicle !== "no" && tags.access !== "private") {
    return true;
  }
  return false;
}

export async function pullOverpassCandidates(
  region: RegionConfig,
  refresh = false,
): Promise<RouteCandidate[]> {
  const res = await fetchOverpass(region.bbox!, refresh);

  const groups = new Map<string, OverpassWay[]>();
  for (const way of res.elements) {
    const name = way.tags?.name?.trim();
    if (!name || !way.geometry?.length) continue;
    const key = name.toUpperCase();
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(way);
  }

  const candidates: RouteCandidate[] = [];
  for (const [key, ways] of groups) {
    const name = ways[0].tags!.name!.trim();
    const whitelisted = region.whitelist.some((re) => re.test(name));
    const usable = ways.filter((w) => isCandidateWay(w.tags ?? {}, whitelisted));
    if (!usable.length) continue;

    const line = chainUnordered(
      usable.map((w) => w.geometry!.map((g) => ({ lat: g.lat, lng: g.lon }))),
      GAP_TOLERANCE_MI,
    );
    const miles = polylineMiles(line);
    if (miles < region.minMiles) continue;

    const longest = [...usable].sort(
      (a, b) =>
        polylineMiles(b.geometry!.map((g) => ({ lat: g.lat, lng: g.lon }))) -
        polylineMiles(a.geometry!.map((g) => ({ lat: g.lat, lng: g.lon }))),
    )[0];
    const tags = longest.tags ?? {};
    candidates.push({
      name,
      slug: slugify(name),
      source: "osm",
      line,
      miles,
      attrs: {
        ref: tags.ref,
        surface: tags.surface,
        fourWd: tags["4wd_only"] === "yes" || usable.some((w) => w.tags?.["4wd_only"] === "yes"),
        osmTags: tags,
      },
      whitelisted,
    });
    void key;
  }
  return candidates;
}
