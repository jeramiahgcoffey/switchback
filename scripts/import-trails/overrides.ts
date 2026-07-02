/**
 * Curated editorial layer over the imported data. The pipeline derives
 * everything it can from source attributes and terrain math; this file holds
 * what only a human (or the hand-authored seed catalog) knows: reputation
 * difficulty for famous routes, named obstacles, campsites, and copy.
 *
 * Keys are the PRE-override slug the pipeline generates from the source name
 * (e.g. MVUM "BLACK BEAR" -> "black-bear"). An override may re-slug a route
 * to replace a hand-authored seed entry with real imported geometry.
 */
import type {
  CellCoverage,
  Difficulty,
  Season,
  Terrain,
  WaypointKind,
} from "../../lib/types";

export interface WaypointSeed {
  name: string;
  kind: WaypointKind;
  lat: number;
  lng: number;
  description: string;
}

export interface TrailOverride {
  skip?: boolean;
  slug?: string;
  name?: string;
  difficulty?: Difficulty;
  terrain?: Terrain[];
  seasons?: Season[];
  cellCoverage?: CellCoverage;
  estimatedDays?: number;
  summary?: string;
  description?: string;
  /** Editorial waypoints; the pipeline snaps them onto the imported track. */
  waypointSeeds?: WaypointSeed[];
}

export const OVERRIDES: Record<string, TrailOverride> = {
  // --- Flagship collisions: the hand-authored seed entries stay ----------
  // MVUM covers only the National Forest portion of these routes (Imogene's
  // Ouray approach is a county road; same story for Black Bear's Telluride
  // descent), so the imported geometry is partial. The seed versions carry
  // the full route and the editorial waypoints. Revisit when the pipeline
  // can assemble multi-jurisdiction routes.
  "imogene-pass": { skip: true },
  "black-bear": { skip: true },

  // --- San Juans, reputation difficulty and terrain calls ----------------
  "ophir-pass": { difficulty: 3, terrain: ["shelf-road", "alpine"], seasons: ["summer", "fall"] },
  "poughkeepsie-gulch": { difficulty: 5, terrain: ["rock-garden", "alpine"], seasons: ["summer", "fall"] },
  "engineer-pass": { difficulty: 3, terrain: ["shelf-road", "alpine"], seasons: ["summer", "fall"] },
  "cinnamon-pass": { difficulty: 3, terrain: ["shelf-road", "alpine"], seasons: ["summer", "fall"] },
  "corkscrew-gulch": { difficulty: 3, terrain: ["shelf-road", "alpine"], seasons: ["summer", "fall"] },
  "california-gulch": { difficulty: 3, terrain: ["rock-garden", "alpine"], seasons: ["summer", "fall"] },
  "yankee-boy-basin": { difficulty: 3, terrain: ["shelf-road", "alpine"], seasons: ["summer", "fall"] },
  "governor-basin": { difficulty: 4, terrain: ["shelf-road", "alpine"], seasons: ["summer", "fall"] },
  "stony-pass": { difficulty: 3, terrain: ["alpine", "water-crossing"], seasons: ["summer", "fall"] },
  "last-dollar": { difficulty: 2, terrain: ["forest", "alpine"] },

  // --- Moab reputation calls (keys match the OSM-derived slugs) ----------
  // The OSM "White Rim Road" ways cover only the rim section (~59 mi); the
  // full 100-mile loop spans separately named roads (Shafer, Mineral Bottom).
  // Until the pipeline can assemble multi-name routes, the hand-authored
  // seed entry stays canonical.
  "white-rim-road": { skip: true },
  "shafer-trail": { difficulty: 2, terrain: ["shelf-road", "desert"], seasons: ["spring", "fall"] },
  "lockhart-basin-road": { difficulty: 4, terrain: ["desert", "rock-garden"], seasons: ["spring", "fall"] },
  "chicken-corners-trail": { name: "Chicken Corners", difficulty: 2, terrain: ["shelf-road", "desert"], seasons: ["spring", "fall"] },
  "kane-creek-canyon-trail": { name: "Kane Creek Canyon", difficulty: 3, terrain: ["shelf-road", "desert", "water-crossing"], seasons: ["spring", "fall"] },
  "onion-creek-road": { difficulty: 2, terrain: ["desert", "water-crossing"], seasons: ["spring", "fall"] },
  "gemini-bridges-road": { difficulty: 2, terrain: ["desert", "slickrock"], cellCoverage: "spotty" },
  "long-canyon-road": { difficulty: 2, terrain: ["shelf-road", "desert"] },
  "hurrah-pass": { difficulty: 2, terrain: ["desert", "shelf-road"], cellCoverage: "spotty" },
  "elephant-hill": { difficulty: 4, terrain: ["slickrock", "rock-garden"], seasons: ["spring", "fall"] },
  "hells-revenge-4x4-trail": { name: "Hell's Revenge", slug: "hells-revenge", difficulty: 4, terrain: ["slickrock"], cellCoverage: "spotty" },
  "poison-spider": { difficulty: 4, terrain: ["slickrock", "sand"], cellCoverage: "spotty" },
  "fins-and-things-north": { name: "Fins and Things", slug: "fins-and-things", difficulty: 3, terrain: ["slickrock", "sand"], cellCoverage: "spotty" },
  "top-of-the-world-road": { name: "Top of the World", slug: "top-of-the-world", difficulty: 4, terrain: ["slickrock", "rock-garden"] },
  "la-sal-pass-road": { name: "La Sal Pass", difficulty: 3, terrain: ["alpine", "forest"], seasons: ["summer", "fall"] },
  "lavender-canyon-road": { name: "Lavender Canyon", difficulty: 2, terrain: ["desert", "sand"], seasons: ["spring", "fall"] },
  "horse-canyon-road": { name: "Horse Canyon", difficulty: 2, terrain: ["desert", "sand"], seasons: ["spring", "fall"] },
};
