/**
 * Turn an assembled RouteCandidate into a full app `Trail`. All numeric stats
 * come from real geometry + DEM data; editorial fields fall back to templates
 * unless `overrides.ts` supplies curation. Derived VERDICT logic (readiness,
 * day split, fuel) stays in lib/derive.ts; this file only fills the data type.
 */
import type {
  Difficulty,
  Season,
  Terrain,
  Trail,
  TrailRequirements,
  Waypoint,
} from "../../lib/types";
import type { LatLng, RegionConfig, RouteCandidate } from "./pipeline-types.ts";
import {
  cumulativeMiles,
  elevationGain,
  haversineMiles,
  maxSustainedGradePct,
  resample,
} from "./geo.ts";
import { getElevationsFt } from "./elevation.ts";
import { OVERRIDES } from "./overrides.ts";
// Single source of truth for wheeling speeds: the same constant the app's
// day-split (splitIntoDays) uses, so generated estimatedDays can never drift
// from the planner. derive.ts imports only types, so Node loads it directly.
import { SPEED_BY_DIFFICULTY } from "../../lib/derive.ts";

/** Requirements ramp, consistent with the hand-authored seed catalog. */
const REQUIREMENTS: Record<Difficulty, TrailRequirements> = {
  1: { minClearanceIn: 7, minTireIn: 28, fourLoRequired: false, lockersRecommended: false, winchRecommended: false },
  2: { minClearanceIn: 8.5, minTireIn: 30, fourLoRequired: false, lockersRecommended: false, winchRecommended: false },
  3: { minClearanceIn: 9.5, minTireIn: 31, fourLoRequired: true, lockersRecommended: false, winchRecommended: false },
  4: { minClearanceIn: 10, minTireIn: 32, fourLoRequired: true, lockersRecommended: true, winchRecommended: false },
  5: { minClearanceIn: 11, minTireIn: 34, fourLoRequired: true, lockersRecommended: true, winchRecommended: true },
};

const clampDifficulty = (n: number): Difficulty =>
  Math.max(1, Math.min(5, Math.round(n))) as Difficulty;

function baseDifficulty(c: RouteCandidate): number {
  if (c.source === "mvum") {
    const surface = c.attrs.surface;
    // No surface field means the route came from the motorized Trails layer
    // (>50" 4WD trails), which reads harder than a forest road.
    if (surface === undefined) return 3;
    if (surface.startsWith("NAT")) return 3;
    if (surface.startsWith("IMP")) return 2;
    if (surface.startsWith("AGG")) return 2;
    return 2;
  }
  const tags = c.attrs.osmTags ?? {};
  const byTracktype: Record<string, number> = {
    grade1: 1,
    grade2: 2,
    grade3: 3,
    grade4: 3,
    grade5: 4,
  };
  if (tags.tracktype && byTracktype[tags.tracktype]) return byTracktype[tags.tracktype];
  const surface = tags.surface ?? "";
  if (/rock/.test(surface)) return 4;
  if (/sand/.test(surface)) return 3;
  if (/dirt|ground|earth|unpaved/.test(surface)) return 2;
  if (/gravel|compacted|fine_gravel/.test(surface)) return 1;
  return 2;
}

function deriveDifficulty(c: RouteCandidate, maxGradePct: number): Difficulty {
  let d = baseDifficulty(c);
  if (maxGradePct > 12) d += 1;
  if (c.source === "osm" && c.attrs.fourWd) d += 0.5;
  return clampDifficulty(d);
}

function deriveSeasons(region: RegionConfig, maxElevationFt: number): Season[] {
  if (maxElevationFt > 10000) return ["summer", "fall"];
  if (region.key === "moab") return ["spring", "fall"];
  return ["spring", "summer", "fall"];
}

function deriveTerrain(region: RegionConfig, c: RouteCandidate, maxElevationFt: number): Terrain[] {
  if (region.key === "moab") {
    const surface = c.attrs.osmTags?.surface ?? "";
    return /sand/.test(surface) ? ["desert", "sand"] : ["desert", "slickrock"];
  }
  return maxElevationFt > 11500 ? ["alpine", "shelf-road"] : ["alpine", "forest"];
}

/** Deterministic small hash for stable template picks per slug. */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function templateCopy(
  c: RouteCandidate,
  region: RegionConfig,
  stats: { miles: number; gainFt: number; maxElevFt: number; difficulty: Difficulty },
): { summary: string; description: string } {
  const miles = Math.round(stats.miles * 10) / 10;
  const gain = Math.round(stats.gainFt / 10) * 10;
  const high = Math.round(stats.maxElevFt / 10) * 10;
  const road = c.attrs.ref
    ? c.source === "mvum"
      ? `Forest Road ${c.attrs.ref.replace(/^0+/, "")}`
      : c.attrs.ref
    : null;

  const summaries = [
    `${miles} miles of ${region.region} backcountry, topping out at ${high.toLocaleString("en-US")} ft.`,
    `A ${miles}-mile ${region.state} route climbing ${gain.toLocaleString("en-US")} ft through the ${region.region}.`,
    `${miles} miles through the ${region.region}, high point ${high.toLocaleString("en-US")} ft.`,
  ];
  const summary = summaries[hash(c.slug) % summaries.length];

  const parts: string[] = [];
  parts.push(
    `${c.name} runs ${miles} miles through the ${region.region}` +
      (road ? ` along ${road}` : "") +
      `, climbing ${gain.toLocaleString("en-US")} ft to a high point of ${high.toLocaleString("en-US")} ft.`,
  );
  if (c.source === "mvum") {
    parts.push(
      `The route is a designated motor vehicle route on the ${c.attrs.forestName}` +
        (c.attrs.seasonal === "seasonal"
          ? ", with seasonal closures; check the current Motor Vehicle Use Map before you commit."
          : "; check the current Motor Vehicle Use Map for open dates before you commit."),
    );
  } else {
    parts.push(
      "Route geometry comes from OpenStreetMap; verify current access and conditions locally before you commit.",
    );
  }
  parts.push(
    stats.difficulty >= 4
      ? "Expect committed, technical driving. Travel with a second rig and a full recovery kit."
      : stats.difficulty >= 3
        ? "A capable stock 4x4 with low range will work it out, but airing down buys comfort."
        : "Any high-clearance vehicle in good weather; a relaxed day out with big views.",
  );
  parts.push("No services on route. Fuel and stock up before the trailhead.");
  return { summary, description: parts.join(" ") };
}

function snapWaypoints(
  slug: string,
  name: string,
  seeds: { name: string; kind: Waypoint["kind"]; lat: number; lng: number; description: string }[],
  track: Trail["track"],
): Waypoint[] {
  const last = track.length - 1;
  const snapped: Waypoint[] = [];
  for (const seed of seeds) {
    let best = 0;
    let bestDist = Infinity;
    track.forEach((p, i) => {
      const d = haversineMiles(seed, p);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    // The conceptual endpoints always anchor the route ends. A trailhead or
    // exit seed far from its endpoint means the imported geometry covers
    // less route than the editorial data describes; skip it so the default
    // generic endpoint waypoints stay honest.
    if (seed.kind === "trailhead") {
      if (haversineMiles(seed, track[0]) > 0.75) continue;
      best = 0;
    } else if (seed.kind === "exit") {
      if (haversineMiles(seed, track[last]) > 0.75) continue;
      best = last;
    }
    // An intermediate seed off the imported route sits outside its coverage;
    // keep the timeline honest.
    else if (bestDist > 0.5) continue;
    snapped.push({
      id: "",
      name: seed.name,
      kind: seed.kind,
      lat: track[best].lat,
      lng: track[best].lng,
      mileMarker: track[best].distanceFromStartMi,
      trackIndex: best,
      description: seed.description,
    });
  }
  // Backfill generic endpoints when the editorial ones were skipped.
  if (!snapped.some((w) => w.kind === "trailhead")) {
    snapped.push({
      id: "",
      name: `${name} Trailhead`,
      kind: "trailhead",
      lat: track[0].lat,
      lng: track[0].lng,
      mileMarker: 0,
      trackIndex: 0,
      description: "Route start. Air down, check fuel, and log your plan with someone in town.",
    });
  }
  if (!snapped.some((w) => w.kind === "exit")) {
    snapped.push({
      id: "",
      name: "Trail End",
      kind: "exit",
      lat: track[last].lat,
      lng: track[last].lng,
      mileMarker: track[last].distanceFromStartMi,
      trackIndex: last,
      description: "End of the imported route. Air up before pavement.",
    });
  }
  return snapped
    .sort((a, b) => a.mileMarker - b.mileMarker)
    .map((w, n) => ({ ...w, id: `${slug}-wp-${n + 1}` }));
}

function defaultWaypoints(slug: string, name: string, track: Trail["track"]): Waypoint[] {
  const last = track.length - 1;
  const waypoints: Waypoint[] = [
    {
      id: `${slug}-wp-1`,
      name: `${name} Trailhead`,
      kind: "trailhead",
      lat: track[0].lat,
      lng: track[0].lng,
      mileMarker: 0,
      trackIndex: 0,
      description: "Route start. Air down, check fuel, and log your plan with someone in town.",
    },
  ];
  // Interior high point worth marking if it stands well above both ends.
  let hi = 0;
  track.forEach((p, i) => {
    if (p.elevationFt > track[hi].elevationFt) hi = i;
  });
  const endsMax = Math.max(track[0].elevationFt, track[last].elevationFt);
  if (hi > 0 && hi < last && track[hi].elevationFt - endsMax > 400) {
    waypoints.push({
      id: `${slug}-wp-2`,
      name: "High Point",
      kind: "viewpoint",
      lat: track[hi].lat,
      lng: track[hi].lng,
      mileMarker: track[hi].distanceFromStartMi,
      trackIndex: hi,
      description: `The route tops out here at ${Math.round(track[hi].elevationFt).toLocaleString("en-US")} ft.`,
    });
  }
  waypoints.push({
    id: `${slug}-wp-${waypoints.length + 1}`,
    name: "Trail End",
    kind: "exit",
    lat: track[last].lat,
    lng: track[last].lng,
    mileMarker: track[last].distanceFromStartMi,
    trackIndex: last,
    description: "End of the imported route. Air up before pavement.",
  });
  return waypoints;
}

const round = (n: number, dp: number) => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

export async function synthesizeTrail(
  c: RouteCandidate,
  region: RegionConfig,
): Promise<Trail | null> {
  const override = OVERRIDES[c.slug] ?? {};
  if (override.skip) return null;

  const targetPoints = Math.max(50, Math.min(120, Math.round(c.miles / 0.25)));
  const line: LatLng[] = resample(c.line, targetPoints).map((p) => ({
    lat: round(p.lat, 5),
    lng: round(p.lng, 5),
  }));

  // Sources have no inherent travel direction. When editorial waypoints
  // exist, orient the track so it runs trailhead -> exit.
  const seedTrailhead = override.waypointSeeds?.find((s) => s.kind === "trailhead");
  const seedExit = override.waypointSeeds?.find((s) => s.kind === "exit");
  if (seedTrailhead && seedExit) {
    const end = line.length - 1;
    const forward =
      haversineMiles(seedTrailhead, line[0]) + haversineMiles(seedExit, line[end]);
    const reversed =
      haversineMiles(seedTrailhead, line[end]) + haversineMiles(seedExit, line[0]);
    if (reversed < forward) line.reverse();
  }
  const elevFt = await getElevationsFt(line);
  const cum = cumulativeMiles(line);

  const track: Trail["track"] = line.map((p, i) => ({
    lat: p.lat,
    lng: p.lng,
    elevationFt: elevFt[i],
    distanceFromStartMi: round(cum[i], 2),
  }));

  const distanceMiles = round(cum[cum.length - 1], 1);
  const gainFt = elevationGain(elevFt);
  const maxElevationFt = Math.max(...elevFt);
  const maxGrade = maxSustainedGradePct(elevFt, cum);

  const difficulty = override.difficulty ?? deriveDifficulty(c, maxGrade);
  const seasons = override.seasons ?? deriveSeasons(region, maxElevationFt);
  const terrain = override.terrain ?? deriveTerrain(region, c, maxElevationFt);
  const slug = override.slug ?? c.slug;
  const name = override.name ?? c.name;
  const estimatedDays =
    override.estimatedDays ??
    Math.max(1, Math.ceil(distanceMiles / (SPEED_BY_DIFFICULTY[difficulty] * 6)));

  const copy = templateCopy(c, region, {
    miles: distanceMiles,
    gainFt,
    maxElevFt: maxElevationFt,
    difficulty,
  });

  return {
    id: `trail-${slug}`,
    slug,
    name,
    region: region.region,
    state: region.state,
    summary: override.summary ?? copy.summary,
    description: override.description ?? copy.description,
    difficulty,
    distanceMiles,
    estimatedDays,
    elevationGainFt: gainFt,
    maxElevationFt,
    seasons,
    terrain,
    cellCoverage: override.cellCoverage ?? "none",
    longestResupplyGapMiles: Math.round(distanceMiles),
    requirements: REQUIREMENTS[difficulty],
    track,
    waypoints: override.waypointSeeds
      ? snapWaypoints(slug, name, override.waypointSeeds, track)
      : defaultWaypoints(slug, name, track),
    heroImage: `/images/trails/${slug}.svg`,
    dataSource:
      c.source === "mvum"
        ? {
            name: "USFS Motor Vehicle Use Map (FSGeodata EDW)",
            license: "Public domain (US federal data)",
          }
        : {
            name: "OpenStreetMap",
            license: "ODbL 1.0",
            attribution: "(c) OpenStreetMap contributors",
          },
  };
}
