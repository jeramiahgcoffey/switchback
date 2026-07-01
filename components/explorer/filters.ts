/**
 * Trail Explorer filter model: pure, framework-free.
 *
 * Filters live in URL searchParams so every view is shareable:
 *   /trails?diff=3,4&terrain=slickrock,desert&season=fall&len=multi&state=UT
 *
 * Within a facet options OR together; across facets they AND.
 */
import type { Difficulty, Season, Terrain, Trail } from "@/lib/types";
import { trails } from "@/lib/data/trails";

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

export type TripLength = "day" | "overnight" | "multi";

export interface ExplorerFilters {
  difficulty: Difficulty[];
  terrain: Terrain[];
  seasons: Season[];
  lengths: TripLength[];
  states: string[];
}

export const EMPTY_FILTERS: ExplorerFilters = {
  difficulty: [],
  terrain: [],
  seasons: [],
  lengths: [],
  states: [],
};

/** Marker payload the overview map needs. No Leaflet types here. */
export interface ExplorerMarker {
  slug: string;
  name: string;
  difficulty: Difficulty;
  lat: number;
  lng: number;
  distanceMiles: number;
  estimatedDays: number;
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export const DIFFICULTY_OPTIONS: Difficulty[] = [1, 2, 3, 4, 5];

export const TERRAIN_OPTIONS: Terrain[] = [
  "slickrock",
  "sand",
  "mud",
  "water-crossing",
  "shelf-road",
  "rock-garden",
  "forest",
  "alpine",
  "desert",
];

export const TERRAIN_LABEL: Record<Terrain, string> = {
  slickrock: "Slickrock",
  sand: "Sand",
  mud: "Mud",
  "water-crossing": "Water crossing",
  "shelf-road": "Shelf road",
  "rock-garden": "Rock garden",
  forest: "Forest",
  alpine: "Alpine",
  desert: "Desert",
};

export const SEASON_OPTIONS: Season[] = ["spring", "summer", "fall", "winter"];

export const SEASON_LABEL: Record<Season, string> = {
  spring: "Spring",
  summer: "Summer",
  fall: "Fall",
  winter: "Winter",
};

export const LENGTH_OPTIONS: TripLength[] = ["day", "overnight", "multi"];

export const LENGTH_LABEL: Record<TripLength, { label: string; hint: string }> = {
  day: { label: "Day run", hint: "1 day" },
  overnight: { label: "Overnight", hint: "2 days" },
  multi: { label: "Expedition", hint: "3+ days" },
};

/** "CO/UT" counts for both CO and UT. */
export function statesOf(trail: Pick<Trail, "state">): string[] {
  return trail.state.split("/").map((s) => s.trim());
}

/** Unique state codes present in the catalog, alphabetized. */
export const STATE_OPTIONS: string[] = [
  ...new Set(trails.flatMap((t) => statesOf(t))),
].sort();

export function lengthBucket(estimatedDays: number): TripLength {
  if (estimatedDays <= 1) return "day";
  if (estimatedDays === 2) return "overnight";
  return "multi";
}

// ---------------------------------------------------------------------------
// URL <-> filters
// ---------------------------------------------------------------------------

const PARAM_KEYS = {
  difficulty: "diff",
  terrain: "terrain",
  seasons: "season",
  lengths: "len",
  states: "state",
} as const;

/** Structural type so this module works with URLSearchParams and Next's ReadonlyURLSearchParams. */
interface ParamsLike {
  getAll(name: string): string[];
}

function parseList(params: ParamsLike, key: string): string[] {
  return params
    .getAll(key)
    .flatMap((v) => v.split(","))
    .map((v) => v.trim())
    .filter(Boolean);
}

function keepValid<T extends string | number>(raw: (string | number)[], allowed: readonly T[]): T[] {
  const out: T[] = [];
  for (const opt of allowed) {
    if (raw.some((r) => String(r) === String(opt)) && !out.includes(opt)) out.push(opt);
  }
  return out; // canonical option order, deduped
}

/** Parse + validate searchParams; unknown values are dropped silently. */
export function parseFilters(params: ParamsLike): ExplorerFilters {
  return {
    difficulty: keepValid(parseList(params, PARAM_KEYS.difficulty), DIFFICULTY_OPTIONS),
    terrain: keepValid(parseList(params, PARAM_KEYS.terrain), TERRAIN_OPTIONS),
    seasons: keepValid(parseList(params, PARAM_KEYS.seasons), SEASON_OPTIONS),
    lengths: keepValid(parseList(params, PARAM_KEYS.lengths), LENGTH_OPTIONS),
    states: keepValid(parseList(params, PARAM_KEYS.states), STATE_OPTIONS),
  };
}

/** Serialize to a query string ("" when no filters are active). */
export function serializeFilters(filters: ExplorerFilters): string {
  const params = new URLSearchParams();
  const put = (key: string, values: readonly (string | number)[]) => {
    if (values.length) params.set(key, values.join(","));
  };
  put(PARAM_KEYS.difficulty, filters.difficulty);
  put(PARAM_KEYS.terrain, filters.terrain);
  put(PARAM_KEYS.seasons, filters.seasons);
  put(PARAM_KEYS.lengths, filters.lengths);
  put(PARAM_KEYS.states, filters.states);
  return params.toString();
}

export function countActiveFilters(filters: ExplorerFilters): number {
  return (
    filters.difficulty.length +
    filters.terrain.length +
    filters.seasons.length +
    filters.lengths.length +
    filters.states.length
  );
}

// ---------------------------------------------------------------------------
// Matching + facet counts
// ---------------------------------------------------------------------------

export function trailMatches(trail: Trail, filters: ExplorerFilters): boolean {
  if (filters.difficulty.length && !filters.difficulty.includes(trail.difficulty)) return false;
  if (filters.terrain.length && !trail.terrain.some((t) => filters.terrain.includes(t)))
    return false;
  if (filters.seasons.length && !trail.seasons.some((s) => filters.seasons.includes(s)))
    return false;
  if (filters.lengths.length && !filters.lengths.includes(lengthBucket(trail.estimatedDays)))
    return false;
  if (filters.states.length && !statesOf(trail).some((s) => filters.states.includes(s)))
    return false;
  return true;
}

export type FacetKey = keyof ExplorerFilters;

/**
 * How many trails an option would surface, ignoring its own facet's current
 * selection but respecting every other facet, standard faceted-count math,
 * so the rail's numbers always tell the truth about what a click yields.
 */
export function facetOptionCount(
  catalog: readonly Trail[],
  filters: ExplorerFilters,
  facet: FacetKey,
  option: string | number,
): number {
  const solo: ExplorerFilters = { ...filters, [facet]: [option] };
  return catalog.filter((t) => trailMatches(t, solo)).length;
}

/** Toggle one option within a facet, preserving canonical option order. */
export function toggleFacetOption(
  filters: ExplorerFilters,
  facet: FacetKey,
  option: string | number,
): ExplorerFilters {
  const current = filters[facet] as (string | number)[];
  const next = current.some((v) => String(v) === String(option))
    ? current.filter((v) => String(v) !== String(option))
    : [...current, option];
  const order: Record<FacetKey, readonly (string | number)[]> = {
    difficulty: DIFFICULTY_OPTIONS,
    terrain: TERRAIN_OPTIONS,
    seasons: SEASON_OPTIONS,
    lengths: LENGTH_OPTIONS,
    states: STATE_OPTIONS,
  };
  const canonical = order[facet].filter((opt) => next.some((v) => String(v) === String(opt)));
  return { ...filters, [facet]: canonical };
}
