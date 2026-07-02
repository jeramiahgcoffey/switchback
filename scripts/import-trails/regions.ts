/**
 * Import regions. One entry per pull; a region proves the pipeline before the
 * next is added. Whitelists guarantee the famous routes make the cut; the
 * remainder of each region's target fills with the longest qualifying routes.
 */
import type { RegionConfig } from "./pipeline-types.ts";

export const REGIONS: RegionConfig[] = [
  {
    key: "san-juans",
    region: "San Juan Mountains",
    state: "CO",
    source: "mvum",
    target: 32,
    minMiles: 4,
    mvumWhere:
      "forestname IN ('Grand Mesa, Uncompahgre and Gunnison National Forests','San Juan National Forest')",
    whitelist: [
      /imogene/i,
      /ophir/i,
      /black bear/i,
      /engineer/i,
      /cinnamon/i,
      /poughkeepsie/i,
      /california gulch/i,
      /corkscrew/i,
      /yankee boy/i,
      /governor basin/i,
      /stony pass/i,
      /picayne|picayune/i,
      /placer gulch/i,
      /eureka gulch/i,
      /clear lake/i,
      /kendall/i,
      /cunningham/i,
      /last dollar/i,
      /owl creek/i,
      /fall creek/i,
    ],
  },
  {
    key: "moab",
    region: "Moab Canyon Country",
    state: "UT",
    source: "osm",
    target: 20,
    minMiles: 4,
    // south, west, north, east: Canyonlands rims through Moab valley.
    bbox: [38.0, -110.2, 38.85, -109.2],
    whitelist: [
      /white rim/i,
      /shafer/i,
      /lockhart basin/i,
      /chicken corners/i,
      /kane creek/i,
      /onion creek/i,
      /gemini bridges/i,
      /long canyon/i,
      /hurrah pass/i,
      /elephant hill/i,
      /potash/i,
      /fins and things/i,
      /hell'?s revenge/i,
      /poison spider/i,
      /top of the world/i,
      /la sal pass/i,
      /lavender canyon/i,
      /horse canyon/i,
      /beef basin/i,
    ],
  },
];
