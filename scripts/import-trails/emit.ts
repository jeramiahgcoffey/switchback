/**
 * Emitter: writes `lib/data/trails.generated.ts` and one hero SVG per trail.
 * Output is formatted to match the hand-authored seed file (track points one
 * per line) so diffs stay reviewable.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Trail } from "../../lib/types";
import { heroSvg } from "./hero.ts";
import { REPO_ROOT } from "./util.ts";

const q = JSON.stringify;

function emitTrail(t: Trail): string {
  const track = t.track
    .map(
      (p) =>
        `    { lat: ${p.lat}, lng: ${p.lng}, elevationFt: ${p.elevationFt}, distanceFromStartMi: ${p.distanceFromStartMi} },`,
    )
    .join("\n");
  const waypoints = t.waypoints
    .map(
      (w) =>
        `    { id: ${q(w.id)}, name: ${q(w.name)}, kind: ${q(w.kind)}, lat: ${w.lat}, lng: ${w.lng}, mileMarker: ${w.mileMarker}, trackIndex: ${w.trackIndex}, description: ${q(w.description)} },`,
    )
    .join("\n");
  const ds = t.dataSource!;
  return `  {
    id: ${q(t.id)},
    slug: ${q(t.slug)},
    name: ${q(t.name)},
    region: ${q(t.region)},
    state: ${q(t.state)},
    summary: ${q(t.summary)},
    description: ${q(t.description)},
    difficulty: ${t.difficulty},
    distanceMiles: ${t.distanceMiles},
    estimatedDays: ${t.estimatedDays},
    elevationGainFt: ${t.elevationGainFt},
    maxElevationFt: ${t.maxElevationFt},
    seasons: ${q(t.seasons)},
    terrain: ${q(t.terrain)},
    cellCoverage: ${q(t.cellCoverage)},
    longestResupplyGapMiles: ${t.longestResupplyGapMiles},
    requirements: {
      minClearanceIn: ${t.requirements.minClearanceIn},
      minTireIn: ${t.requirements.minTireIn},
      fourLoRequired: ${t.requirements.fourLoRequired},
      lockersRecommended: ${t.requirements.lockersRecommended},
      winchRecommended: ${t.requirements.winchRecommended},
    },
    track: [
${track}
    ],
    waypoints: [
${waypoints}
    ],
    heroImage: ${q(t.heroImage)},
    dataSource: {
      name: ${q(ds.name)},
      license: ${q(ds.license)},${ds.attribution ? `\n      attribution: ${q(ds.attribution)},` : ""}
    },
  },`;
}

export function emit(trails: Trail[]): void {
  const sorted = [...trails].sort((a, b) => a.slug.localeCompare(b.slug));

  const file = `/**
 * GENERATED FILE, do not edit by hand. Rebuild: npm run import-trails
 *
 * Imported trail catalog. Route geometry and stats come from public sources:
 * - USFS Motor Vehicle Use Map via the FSGeodata EDW ArcGIS services
 *   (US federal data, public domain).
 * - OpenStreetMap via the Overpass API. (c) OpenStreetMap contributors,
 *   licensed ODbL 1.0. Per-trail provenance is on each entry's dataSource.
 * Elevation: USGS NED 10m via Open Topo Data (public domain).
 *
 * Editorial curation lives in scripts/import-trails/overrides.ts.
 */
import type { Trail } from "@/lib/types";

export const generatedTrails: Trail[] = [
${sorted.map(emitTrail).join("\n")}
];
`;

  writeFileSync(join(REPO_ROOT, "lib", "data", "trails.generated.ts"), file);

  const imgDir = join(REPO_ROOT, "public", "images", "trails");
  mkdirSync(imgDir, { recursive: true });
  let wrote = 0;
  for (const t of sorted) {
    const path = join(imgDir, `${t.slug}.svg`);
    // Hand-made seed art wins; only fill gaps.
    if (existsSync(path)) continue;
    writeFileSync(path, heroSvg(t));
    wrote++;
  }
  console.log(`emit: ${sorted.length} trails, ${wrote} new hero images`);
}
