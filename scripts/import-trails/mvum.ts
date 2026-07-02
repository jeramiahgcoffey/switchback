/**
 * USFS Motor Vehicle Use Map (MVUM) source. Public domain federal data.
 *
 * Queries the EDW_MVUM_01 ArcGIS REST service (layer 1 = Roads, layer 2 =
 * Trails) as GeoJSON, groups segments into named routes by normalized name,
 * orders them by begin milepost, and chains them into a single polyline.
 * Service: https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_MVUM_01/MapServer
 */
import type { LatLng, RegionConfig, RouteCandidate } from "./pipeline-types.ts";
import { chainOrdered, polylineMiles } from "./geo.ts";
import { cachedFetchJson, slugify, titleCase } from "./util.ts";

const BASE = "https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_MVUM_01/MapServer";
const LAYERS = { roads: 1, trails: 2 } as const;
const PAGE_SIZE = 2000;
/** Milepost gap larger than this splits a route (county segments, private land). */
const GAP_TOLERANCE_MI = 0.75;

const COMMON_FIELDS = [
  "name",
  "id",
  "rte_cn",
  "bmp",
  "emp",
  "gis_miles",
  "symbol",
  "mvum_symbol_name",
  "seasonal",
  "highclearancevehicle",
  "fourwd_gt50inches",
  "forestname",
  "districtname",
];
/** The Trails layer has no surfacetype; its routes are motorized trails. */
const OUT_FIELDS: Record<number, string> = {
  [LAYERS.roads]: [...COMMON_FIELDS, "surfacetype"].join(","),
  [LAYERS.trails]: COMMON_FIELDS.join(","),
};

interface MvumProps {
  name: string | null;
  id: string | null;
  rte_cn: string | null;
  bmp: number | null;
  emp: number | null;
  gis_miles: number | null;
  symbol: string | null;
  mvum_symbol_name: string | null;
  seasonal: string | null;
  /** Roads layer only; the Trails layer has no surface field. */
  surfacetype?: string | null;
  highclearancevehicle: string | null;
  fourwd_gt50inches: string | null;
  forestname: string | null;
  districtname: string | null;
}

interface GeoJsonFeature {
  geometry: {
    type: "LineString" | "MultiLineString";
    coordinates: number[][] | number[][][];
  } | null;
  properties: MvumProps;
}

interface GeoJsonPage {
  features: GeoJsonFeature[];
  /** ArcGIS sets this when the page hit maxRecordCount. */
  properties?: { exceededTransferLimit?: boolean };
}

async function fetchLayer(
  layer: number,
  where: string,
  refresh: boolean,
): Promise<GeoJsonFeature[]> {
  const all: GeoJsonFeature[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const params = new URLSearchParams({
      where,
      outFields: OUT_FIELDS[layer],
      returnGeometry: "true",
      outSR: "4326",
      f: "geojson",
      resultOffset: String(offset),
      resultRecordCount: String(PAGE_SIZE),
      orderByFields: "objectid",
    });
    const page = await cachedFetchJson<GeoJsonPage>(
      `mvum-l${layer}-o${offset}`,
      `${BASE}/${layer}/query?${params}`,
      undefined,
      refresh,
      (data) => Array.isArray(data.features),
    );
    all.push(...page.features);
    // Page on the server's own truncation flag, not a PAGE_SIZE comparison:
    // a service whose maxRecordCount is below PAGE_SIZE returns a short first
    // page with more rows behind it, and a length check would drop them.
    // The empty-page guard prevents an infinite loop if the flag is stuck.
    if (!page.properties?.exceededTransferLimit || page.features.length === 0) break;
  }
  return all;
}

function segmentLines(f: GeoJsonFeature): LatLng[][] {
  if (!f.geometry) return [];
  const raw =
    f.geometry.type === "LineString"
      ? [f.geometry.coordinates as number[][]]
      : (f.geometry.coordinates as number[][][]);
  return raw.map((line) => line.map(([lng, lat]) => ({ lat, lng })));
}

const isPaved = (surface: string | null | undefined) => (surface ?? "").startsWith("PAV");

export async function pullMvumCandidates(
  region: RegionConfig,
  refresh = false,
): Promise<RouteCandidate[]> {
  const where = region.mvumWhere!;
  const features = [
    ...(await fetchLayer(LAYERS.roads, where, refresh)),
    ...(await fetchLayer(LAYERS.trails, where, refresh)),
  ];

  // Group segments by normalized route name. rte_cn differs per forest for
  // routes that cross a forest boundary (e.g. Ophir Pass), so name is the
  // better route key; far-apart same-name routes split at the chaining step.
  const groups = new Map<string, GeoJsonFeature[]>();
  for (const f of features) {
    const name = f.properties.name?.trim();
    if (!name || !f.geometry) continue;
    const key = name.toUpperCase();
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(f);
  }

  const candidates: RouteCandidate[] = [];
  for (const [key, segs] of groups) {
    // Routes that are pavement end to end are not trails.
    if (segs.every((s) => isPaved(s.properties.surfacetype))) continue;

    const ordered = [...segs].sort(
      (a, b) => (a.properties.bmp ?? 0) - (b.properties.bmp ?? 0),
    );
    const line = chainOrdered(
      ordered.flatMap(segmentLines),
      GAP_TOLERANCE_MI,
    );
    const miles = polylineMiles(line);
    if (miles < region.minMiles) continue;

    const name = titleCase(key);
    const anyFourWd = segs.some(
      (s) => (s.properties.fourwd_gt50inches ?? "").toLowerCase() === "open",
    );
    const anyHighwayLegalOnly = segs.some((s) =>
      (s.properties.mvum_symbol_name ?? "").includes("highway legal"),
    );
    const first = ordered[0].properties;
    candidates.push({
      name,
      slug: slugify(name),
      source: "mvum",
      line,
      miles,
      attrs: {
        ref: first.id ?? undefined,
        surface: first.surfacetype ?? undefined,
        seasonal: segs.some((s) => s.properties.seasonal === "seasonal")
          ? "seasonal"
          : "yearlong",
        fourWd: anyFourWd,
        highwayLegalOnly: anyHighwayLegalOnly,
        forestName: first.forestname ?? undefined,
        districtName: first.districtname ?? undefined,
      },
      whitelisted: region.whitelist.some((re) => re.test(name)),
    });
  }
  return candidates;
}
