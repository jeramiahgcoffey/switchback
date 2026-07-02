/**
 * Switchback domain types.
 *
 * All app data is static, typed TypeScript under `lib/` — no fetch layer,
 * no API keys. Derived logic lives in `lib/derive.ts`; user state lives in
 * localStorage behind the typed hooks in `lib/storage.ts`.
 */

/** 1 = graded dirt, 5 = technical rock. */
export type Difficulty = 1 | 2 | 3 | 4 | 5;

export type Terrain =
  | "slickrock"
  | "sand"
  | "mud"
  | "water-crossing"
  | "shelf-road"
  | "rock-garden"
  | "forest"
  | "alpine"
  | "desert";

export type Season = "spring" | "summer" | "fall" | "winter";

export type CellCoverage = "none" | "spotty" | "good";

export type WaypointKind =
  | "trailhead"
  | "campsite"
  | "fuel"
  | "water"
  | "viewpoint"
  | "obstacle"
  | "bailout"
  | "exit";

export type GearCategory =
  | "recovery"
  | "camp"
  | "kitchen"
  | "water"
  | "comms"
  | "tools-spares"
  | "safety"
  | "personal";

/**
 * A single point along a trail's GPS track. `distanceFromStartMi` is
 * precomputed in the seed data so the elevation chart <-> map sync is a
 * pure index lookup — no haversine at runtime.
 */
export interface TrackPoint {
  lat: number;
  lng: number;
  elevationFt: number;
  distanceFromStartMi: number;
}

export interface Waypoint {
  id: string;
  name: string;
  kind: WaypointKind;
  lat: number;
  lng: number;
  mileMarker: number;
  /** Index into the owning trail's `track` array. */
  trackIndex: number;
  description: string;
}

export interface TrailRequirements {
  minClearanceIn: number;
  minTireIn: number;
  fourLoRequired: boolean;
  lockersRecommended: boolean;
  winchRecommended: boolean;
}

/**
 * Provenance for imported trail data. Drives the attribution line on trail
 * pages; ODbL sources (OpenStreetMap) legally require it.
 */
export interface TrailDataSource {
  name: string;
  license: string;
  attribution?: string;
}

export interface Trail {
  id: string;
  slug: string;
  name: string;
  region: string;
  state: string;
  summary: string;
  description: string;
  difficulty: Difficulty;
  distanceMiles: number;
  estimatedDays: number;
  elevationGainFt: number;
  maxElevationFt: number;
  seasons: Season[];
  terrain: Terrain[];
  cellCoverage: CellCoverage;
  longestResupplyGapMiles: number;
  requirements: TrailRequirements;
  track: TrackPoint[];
  waypoints: Waypoint[];
  heroImage: string;
  /** Present on imported trails; absent on hand-authored seed data. */
  dataSource?: TrailDataSource;
}

export interface RigProfile {
  id: string;
  name: string;
  vehicle: string;
  tireIn: number;
  clearanceIn: number;
  hasWinch: boolean;
  hasLockers: boolean;
  hasFourLo: boolean;
  fuelRangeMiles: number;
  payloadLbs: number;
}

export interface GearItem {
  id: string;
  name: string;
  category: GearCategory;
  weightLbs: number;
  essential: boolean;
  /** When true, quantity (and weight) scales with party size. */
  qtyPerPerson?: boolean;
  /** When present, the item is only packed if the trip matches. */
  conditions?: {
    minDifficulty?: Difficulty;
    terrain?: Terrain[];
    minDays?: number;
    seasons?: Season[];
  };
  note?: string;
}

export interface DayPlan {
  day: number;
  startWaypointId: string;
  endWaypointId: string;
  miles: number;
  estWheelHours: number;
  campWaypointId: string | null;
  resupplyWaypointIds: string[];
}

export interface TripPlan {
  id: string;
  trailSlug: string;
  /** ISO date string, e.g. "2026-07-04". */
  startDate: string;
  partySize: number;
  rigId: string;
  days: DayPlan[];
  /** GearItem id -> checked. */
  checklist: Record<string, boolean>;
  /** ISO timestamp. */
  createdAt: string;
}

export type ReadinessStatus = "pass" | "warn" | "fail";

/** Derived via `matchRigToTrail()` — never stored. */
export interface Readiness {
  verdict: "go" | "caution" | "no-go";
  reasons: { label: string; status: ReadinessStatus; detail: string }[];
}

/**
 * What the Garage persists: preset id, optional spec overrides, loadout.
 * Lives here (not in the "use client" storage module) so server code — the
 * profile API — can import the type.
 */
export interface ActiveRigState {
  rigId: string;
  /** Spec-sheet edits layered over the preset. */
  customSpecs?: Partial<Omit<RigProfile, "id" | "name" | "vehicle">>;
  /** Gear item ids toggled onto the build. */
  gearIds: string[];
}

/**
 * Per-user account document, and the `/api/profile` payload. Mirrors the two
 * synced localStorage blobs plus a client-set `updatedAt` for last-write-wins.
 */
export interface UserProfile {
  activeRig: ActiveRigState;
  tripPlan: TripPlan | null;
  /** ISO timestamp of the last local edit; drives sign-in reconciliation. */
  updatedAt: string;
}
