/**
 * Validation gate for the generated catalog: structural invariants plus a
 * pass through the real lib/derive.ts functions every app surface uses.
 *
 *   node scripts/import-trails/validate.ts
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { generatedTrails } from "../../lib/data/trails.generated.ts";
import { rigs } from "../../lib/data/rigs.ts";
import { buildFuelCheck, matchRigToTrail, splitIntoDays } from "../../lib/derive.ts";
import { REPO_ROOT } from "./util.ts";

let failures = 0;
const fail = (slug: string, msg: string) => {
  failures++;
  console.error(`FAIL ${slug}: ${msg}`);
};

const slugs = new Set<string>();
for (const t of generatedTrails) {
  if (slugs.has(t.slug)) fail(t.slug, "duplicate slug");
  slugs.add(t.slug);

  // Track invariants: the chart<->map sync binary search requires strictly
  // increasing distanceFromStartMi starting at 0.
  if (t.track.length < 2) fail(t.slug, "track too short");
  if (t.track[0].distanceFromStartMi !== 0) fail(t.slug, "track does not start at mile 0");
  for (let i = 1; i < t.track.length; i++) {
    if (t.track[i].distanceFromStartMi <= t.track[i - 1].distanceFromStartMi) {
      fail(t.slug, `track distance not strictly increasing at index ${i}`);
      break;
    }
  }
  const last = t.track[t.track.length - 1].distanceFromStartMi;
  if (Math.abs(last - t.distanceMiles) > 0.2) {
    fail(t.slug, `distanceMiles ${t.distanceMiles} != track end ${last}`);
  }
  for (const p of t.track) {
    if (p.elevationFt < -300 || p.elevationFt > 14500) {
      fail(t.slug, `implausible elevation ${p.elevationFt} ft`);
      break;
    }
  }
  if (t.maxElevationFt !== Math.max(...t.track.map((p) => p.elevationFt))) {
    fail(t.slug, "maxElevationFt does not match track");
  }

  // Waypoint invariants.
  const kinds = t.waypoints.map((w) => w.kind);
  if (kinds[0] !== "trailhead") fail(t.slug, "first waypoint is not a trailhead");
  if (!kinds.includes("exit")) fail(t.slug, "no exit waypoint");
  for (const w of t.waypoints) {
    if (w.trackIndex < 0 || w.trackIndex >= t.track.length) {
      fail(t.slug, `waypoint ${w.id} trackIndex out of bounds`);
      continue;
    }
    if (Math.abs(t.track[w.trackIndex].distanceFromStartMi - w.mileMarker) > 0.01) {
      fail(t.slug, `waypoint ${w.id} mileMarker disagrees with trackIndex`);
    }
  }
  for (let i = 1; i < t.waypoints.length; i++) {
    if (t.waypoints[i].mileMarker < t.waypoints[i - 1].mileMarker) {
      fail(t.slug, "waypoints not sorted by mileMarker");
      break;
    }
  }

  if (!t.seasons.length) fail(t.slug, "no seasons");
  if (!t.terrain.length) fail(t.slug, "no terrain");
  if (!t.dataSource) fail(t.slug, "missing dataSource provenance");
  if (/—|–/.test(t.summary + t.description)) fail(t.slug, "em/en dash in copy");
  if (!existsSync(join(REPO_ROOT, "public", t.heroImage))) {
    fail(t.slug, `hero image missing: ${t.heroImage}`);
  }

  // Exercise the real derive logic the app runs on every surface.
  const days = splitIntoDays(t, t.estimatedDays);
  if (!days.length) fail(t.slug, "splitIntoDays returned no days");
  const dayMiles = days.reduce((s, d) => s + d.miles, 0);
  if (Math.abs(dayMiles - t.distanceMiles) > 1) {
    fail(t.slug, `day split miles ${dayMiles} != trail miles ${t.distanceMiles}`);
  }
  for (const rig of rigs) {
    const r = matchRigToTrail(rig, t);
    if (!r.reasons.length) fail(t.slug, `no readiness reasons for ${rig.id}`);
    const f = buildFuelCheck(days, t, rig);
    if (f.worstGapMiles < 0) fail(t.slug, "negative fuel gap");
  }
}

console.log(
  failures === 0
    ? `OK: ${generatedTrails.length} generated trails passed validation`
    : `${failures} failure(s) across ${generatedTrails.length} trails`,
);
process.exit(failures === 0 ? 0 : 1);
