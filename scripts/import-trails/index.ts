/**
 * Trail import pipeline entry point.
 *
 *   npm run import-trails                 # all regions
 *   npm run import-trails -- --region=moab
 *   npm run import-trails -- --refresh    # ignore the HTTP cache
 *
 * Pull (MVUM/Overpass) -> assemble segments into named routes -> select
 * (whitelist + longest) -> enrich with USGS NED elevation -> synthesize
 * app `Trail` objects -> emit lib/data/trails.generated.ts + hero SVGs.
 */
import type { Trail } from "../../lib/types";
import type { RegionConfig, RouteCandidate } from "./pipeline-types.ts";
import { REGIONS } from "./regions.ts";
import { pullMvumCandidates } from "./mvum.ts";
import { pullOverpassCandidates } from "./overpass.ts";
import { synthesizeTrail } from "./synthesize.ts";
import { emit } from "./emit.ts";

const args = process.argv.slice(2);
const refresh = args.includes("--refresh");
const regionArg = args.find((a) => a.startsWith("--region="))?.split("=")[1];

function select(candidates: RouteCandidate[], region: RegionConfig): RouteCandidate[] {
  const whitelisted = candidates.filter((c) => c.whitelisted);
  const rest = candidates
    .filter((c) => !c.whitelisted)
    .sort((a, b) => b.miles - a.miles);
  const picked = [...whitelisted, ...rest].slice(0, region.target);
  console.log(
    `  ${region.key}: ${candidates.length} candidates, ` +
      `${whitelisted.length} whitelisted, selected ${picked.length}`,
  );
  return picked;
}

async function run(): Promise<void> {
  const regions = REGIONS.filter((r) => !regionArg || r.key === regionArg);
  if (!regions.length) {
    console.error(`Unknown region "${regionArg}". Known: ${REGIONS.map((r) => r.key).join(", ")}`);
    process.exit(1);
  }

  const trails: Trail[] = [];
  const seen = new Set<string>();

  for (const region of regions) {
    console.log(`pull: ${region.key} (${region.source})`);
    const candidates =
      region.source === "mvum"
        ? await pullMvumCandidates(region, refresh)
        : await pullOverpassCandidates(region, refresh);

    for (const cand of select(candidates, region)) {
      const trail = await synthesizeTrail(cand, region);
      if (!trail) continue;
      if (seen.has(trail.slug)) {
        console.warn(`  skip duplicate slug: ${trail.slug}`);
        continue;
      }
      seen.add(trail.slug);
      trails.push(trail);
      console.log(
        `  + ${trail.name.padEnd(28)} d${trail.difficulty}  ${String(trail.distanceMiles).padStart(5)} mi  ` +
          `+${trail.elevationGainFt} ft  max ${trail.maxElevationFt} ft  ${trail.track.length} pts`,
      );
    }
  }

  emit(trails);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
