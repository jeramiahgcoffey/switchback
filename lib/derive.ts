/**
 * Shared derived logic — pure functions only, no React, no side effects.
 * All four feature surfaces (Explorer, Detail, Plan, Garage) consume these
 * so verdicts and numbers agree everywhere. Do not add fetch or state here.
 */
import type {
  DayPlan,
  Difficulty,
  GearItem,
  Readiness,
  ReadinessStatus,
  RigProfile,
  Season,
  Trail,
  Waypoint,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Rig vs. trail readiness
// ---------------------------------------------------------------------------

/** Average wheeling speed by difficulty, mph (graded dirt -> technical rock). */
export const SPEED_BY_DIFFICULTY: Record<Difficulty, number> = {
  1: 25,
  2: 18,
  3: 12,
  4: 8,
  5: 4,
};

/**
 * Off-pavement fuel burn runs well above highway rating. We require rated
 * range >= 3x the longest resupply gap to call it comfortable, and >= 1.5x
 * to call it survivable.
 */
const FUEL_COMFORT_FACTOR = 3;
const FUEL_MINIMUM_FACTOR = 1.5;

/**
 * Score a rig against a trail's requirements, one reason row per check.
 * Verdict: any fail -> 'no-go'; any warn -> 'caution'; else 'go'.
 */
export function matchRigToTrail(rig: RigProfile, trail: Trail): Readiness {
  const req = trail.requirements;
  const reasons: Readiness["reasons"] = [];

  // Tires — within 2" under spec is a warn, more is a fail.
  const tireStatus: ReadinessStatus =
    rig.tireIn >= req.minTireIn ? "pass" : rig.tireIn >= req.minTireIn - 2 ? "warn" : "fail";
  reasons.push({
    label: "Tires",
    status: tireStatus,
    detail:
      tireStatus === "pass"
        ? `Trail recommends ${req.minTireIn}s — you're on ${rig.tireIn}s.`
        : `Trail recommends ${req.minTireIn}s, you're on ${rig.tireIn}s.`,
  });

  // Clearance — within 1" under spec is a warn.
  const clrStatus: ReadinessStatus =
    rig.clearanceIn >= req.minClearanceIn
      ? "pass"
      : rig.clearanceIn >= req.minClearanceIn - 1
        ? "warn"
        : "fail";
  reasons.push({
    label: "Ground clearance",
    status: clrStatus,
    detail:
      clrStatus === "pass"
        ? `${rig.clearanceIn}" clears the ${req.minClearanceIn}" minimum.`
        : `Trail wants ${req.minClearanceIn}" of clearance — you have ${rig.clearanceIn}".`,
  });

  // 4-Lo — hard requirement when flagged.
  const fourLoStatus: ReadinessStatus = !req.fourLoRequired
    ? "pass"
    : rig.hasFourLo
      ? "pass"
      : "fail";
  reasons.push({
    label: "4-Lo",
    status: fourLoStatus,
    detail: !req.fourLoRequired
      ? "Low range not required on this trail."
      : rig.hasFourLo
        ? "Low range required — equipped."
        : "Low range is required on this trail and this rig has none.",
  });

  // Lockers — recommended, never a hard fail.
  const lockerStatus: ReadinessStatus = !req.lockersRecommended
    ? "pass"
    : rig.hasLockers
      ? "pass"
      : "warn";
  reasons.push({
    label: "Lockers",
    status: lockerStatus,
    detail: !req.lockersRecommended
      ? "Lockers not needed here."
      : rig.hasLockers
        ? "Lockers recommended — equipped."
        : "Lockers are strongly recommended; open diffs will make the cruxes harder.",
  });

  // Winch — recommended, never a hard fail.
  const winchStatus: ReadinessStatus = !req.winchRecommended
    ? "pass"
    : rig.hasWinch
      ? "pass"
      : "warn";
  reasons.push({
    label: "Winch",
    status: winchStatus,
    detail: !req.winchRecommended
      ? "Self-recovery gear is optional here."
      : rig.hasWinch
        ? "Winch recommended — equipped."
        : "No winch: on this trail that means waiting for a strap or walking out.",
  });

  // Fuel range vs. longest resupply gap.
  const gap = trail.longestResupplyGapMiles;
  const fuelStatus: ReadinessStatus =
    rig.fuelRangeMiles >= gap * FUEL_COMFORT_FACTOR
      ? "pass"
      : rig.fuelRangeMiles >= gap * FUEL_MINIMUM_FACTOR
        ? "warn"
        : "fail";
  reasons.push({
    label: "Fuel range",
    status: fuelStatus,
    detail:
      fuelStatus === "pass"
        ? `${rig.fuelRangeMiles} mi rated range comfortably covers the ${gap} mi resupply gap.`
        : fuelStatus === "warn"
          ? `${gap} mi between pumps vs. ${rig.fuelRangeMiles} mi rated range — off-road burn can triple; carry extra fuel.`
          : `${gap} mi resupply gap exceeds what a ${rig.fuelRangeMiles} mi rated range can safely cover off-pavement.`,
  });

  const verdict: Readiness["verdict"] = reasons.some((r) => r.status === "fail")
    ? "no-go"
    : reasons.some((r) => r.status === "warn")
      ? "caution"
      : "go";

  return { verdict, reasons };
}

// ---------------------------------------------------------------------------
// Packing list
// ---------------------------------------------------------------------------

/**
 * Filter the gear catalog for a specific trip. An item with `conditions` is
 * included only when EVERY specified condition matches:
 * - minDifficulty: trail.difficulty >= minDifficulty
 * - terrain:       trail shares at least one listed terrain
 * - minDays:       trip length >= minDays
 * - seasons:       trip season is one of the listed seasons
 * Items without conditions are always packed.
 */
export function buildPackingList(
  trail: Trail,
  days: number,
  season: Season,
  partySize: number,
  catalog: GearItem[],
): GearItem[] {
  void partySize; // quantities are resolved by consumers via qtyPerPerson
  return catalog.filter((item) => {
    const c = item.conditions;
    if (!c) return true;
    if (c.minDifficulty !== undefined && trail.difficulty < c.minDifficulty) return false;
    if (c.minDays !== undefined && days < c.minDays) return false;
    if (c.seasons && !c.seasons.includes(season)) return false;
    if (c.terrain && !c.terrain.some((t) => trail.terrain.includes(t))) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Day splitting
// ---------------------------------------------------------------------------

/**
 * Split a trail into a day-by-day itinerary anchored on campsite waypoints.
 * Picks the campsite nearest each even mileage fraction as the night stop;
 * wheel-hour estimates use difficulty-adjusted average speeds.
 */
export function splitIntoDays(trail: Trail, targetDays: number): DayPlan[] {
  const total = trail.distanceMiles;
  const sorted = [...trail.waypoints].sort((a, b) => a.mileMarker - b.mileMarker);
  const start = sorted.find((w) => w.kind === "trailhead") ?? sorted[0];
  const end = sorted.find((w) => w.kind === "exit") ?? sorted[sorted.length - 1];
  const camps = sorted.filter((w) => w.kind === "campsite");
  const speed = SPEED_BY_DIFFICULTY[trail.difficulty];

  const days = Math.max(1, Math.round(targetDays));
  // Choose nights: campsite closest to each ideal split point, no reuse,
  // and always moving forward.
  const nights: Waypoint[] = [];
  const used = new Set<string>();
  for (let d = 1; d < days; d++) {
    const idealMile = (total * d) / days;
    let best: Waypoint | null = null;
    let bestDist = Infinity;
    for (const c of camps) {
      if (used.has(c.id)) continue;
      const prevMile = nights.length ? nights[nights.length - 1].mileMarker : 0;
      if (c.mileMarker <= prevMile) continue;
      const dist = Math.abs(c.mileMarker - idealMile);
      if (dist < bestDist) {
        best = c;
        bestDist = dist;
      }
    }
    if (best) {
      nights.push(best);
      used.add(best.id);
    }
  }

  const stops: Waypoint[] = [start, ...nights, end];
  const plans: DayPlan[] = [];
  for (let i = 0; i < stops.length - 1; i++) {
    const from = stops[i];
    const to = stops[i + 1];
    const miles = Math.max(0, Math.round((to.mileMarker - from.mileMarker) * 10) / 10);
    const resupply = sorted.filter(
      (w) =>
        (w.kind === "fuel" || w.kind === "water") &&
        w.mileMarker > from.mileMarker &&
        w.mileMarker <= to.mileMarker,
    );
    plans.push({
      day: i + 1,
      startWaypointId: from.id,
      endWaypointId: to.id,
      miles,
      estWheelHours: Math.round((miles / speed) * 10) / 10,
      campWaypointId: to.kind === "campsite" ? to.id : null,
      resupplyWaypointIds: resupply.map((w) => w.id),
    });
  }
  return plans;
}

// ---------------------------------------------------------------------------
// Fuel check
// ---------------------------------------------------------------------------

export interface FuelLegCheck {
  day: number;
  /** Longest stretch (mi) without a fuel waypoint that this day sits inside. */
  gapMiles: number;
  exceedsRange: boolean;
}

export interface FuelCheck {
  ok: boolean;
  /** Longest distance between fuel opportunities across the whole route. */
  worstGapMiles: number;
  /** Rig's rated range derated for off-pavement burn. */
  effectiveRangeMiles: number;
  legs: FuelLegCheck[];
}

/** Off-pavement derate applied to rated range for gap comparisons. */
const OFFROAD_RANGE_FACTOR = 0.5;

/**
 * Flag itinerary legs whose fuel gap exceeds the rig's effective off-road
 * range. Fuel opportunities are the trailhead (assume you start full), any
 * `fuel` waypoints, and the exit.
 */
export function buildFuelCheck(days: DayPlan[], trail: Trail, rig: RigProfile): FuelCheck {
  const sorted = [...trail.waypoints].sort((a, b) => a.mileMarker - b.mileMarker);
  const fuelMiles = [
    0,
    ...sorted.filter((w) => w.kind === "fuel").map((w) => w.mileMarker),
    trail.distanceMiles,
  ].sort((a, b) => a - b);

  // Gap segments between consecutive fuel opportunities.
  const segments: { from: number; to: number }[] = [];
  for (let i = 1; i < fuelMiles.length; i++) {
    segments.push({ from: fuelMiles[i - 1], to: fuelMiles[i] });
  }
  const worstGapMiles = Math.max(...segments.map((s) => s.to - s.from), 0);
  const effectiveRangeMiles = Math.round(rig.fuelRangeMiles * OFFROAD_RANGE_FACTOR);

  const waypointMile = (id: string) =>
    trail.waypoints.find((w) => w.id === id)?.mileMarker ?? 0;

  const legs: FuelLegCheck[] = days.map((d) => {
    const startMi = waypointMile(d.startWaypointId);
    const endMi = waypointMile(d.endWaypointId);
    // The largest no-fuel segment this day's driving overlaps.
    let gap = 0;
    for (const s of segments) {
      if (s.from < endMi && s.to > startMi) gap = Math.max(gap, s.to - s.from);
    }
    return { day: d.day, gapMiles: Math.round(gap * 10) / 10, exceedsRange: gap > effectiveRangeMiles };
  });

  return {
    ok: legs.every((l) => !l.exceedsRange),
    worstGapMiles: Math.round(worstGapMiles * 10) / 10,
    effectiveRangeMiles,
    legs,
  };
}

// ---------------------------------------------------------------------------
// Loadout math
// ---------------------------------------------------------------------------

export interface Loadout {
  totalLbs: number;
  byCategory: Record<string, number>;
  pctOfPayload: number;
  /** Rated range derated by carried weight (heavier rig = thirstier rig). */
  loadedFuelRangeMiles: number;
}

/** Range penalty: ~8% of rated range at full payload, linear. */
const RANGE_PENALTY_AT_FULL_PAYLOAD = 0.08;

export function computeLoadout(
  gearIds: string[],
  partySize: number,
  rig: RigProfile,
  catalog: GearItem[],
): Loadout {
  const byCategory: Record<string, number> = {};
  let totalLbs = 0;
  const wanted = new Set(gearIds);
  for (const item of catalog) {
    if (!wanted.has(item.id)) continue;
    const qty = item.qtyPerPerson ? Math.max(1, partySize) : 1;
    const w = item.weightLbs * qty;
    totalLbs += w;
    byCategory[item.category] = (byCategory[item.category] ?? 0) + w;
  }
  totalLbs = Math.round(totalLbs * 10) / 10;
  for (const k of Object.keys(byCategory)) {
    byCategory[k] = Math.round(byCategory[k] * 10) / 10;
  }
  const pctOfPayload = rig.payloadLbs > 0 ? Math.round((totalLbs / rig.payloadLbs) * 1000) / 10 : 0;
  const loadedFuelRangeMiles = Math.round(
    rig.fuelRangeMiles *
      (1 - RANGE_PENALTY_AT_FULL_PAYLOAD * Math.min(1.5, rig.payloadLbs > 0 ? totalLbs / rig.payloadLbs : 0)),
  );
  return { totalLbs, byCategory, pctOfPayload, loadedFuelRangeMiles };
}

// ---------------------------------------------------------------------------
// Chart <-> map sync
// ---------------------------------------------------------------------------

/**
 * Binary-search the track for the point nearest a given distance from the
 * start. `distanceFromStartMi` is precomputed and strictly increasing, so
 * this is O(log n) with no haversine at runtime.
 */
export function nearestTrackIndex(trail: Trail, distanceMi: number): number {
  const track = trail.track;
  if (track.length === 0) return 0;
  if (distanceMi <= track[0].distanceFromStartMi) return 0;
  if (distanceMi >= track[track.length - 1].distanceFromStartMi) return track.length - 1;
  let lo = 0;
  let hi = track.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (track[mid].distanceFromStartMi <= distanceMi) lo = mid;
    else hi = mid;
  }
  return distanceMi - track[lo].distanceFromStartMi <= track[hi].distanceFromStartMi - distanceMi
    ? lo
    : hi;
}

// ---------------------------------------------------------------------------
// Formatting helpers (shared so every gauge reads the same)
// ---------------------------------------------------------------------------

/** "38.5733 N 109.5498 W" — the mono coordinate readout used under trail names. */
export function formatCoords(lat: number, lng: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)} ${ns} ${Math.abs(lng).toFixed(4)} ${ew}`;
}

export function formatMiles(mi: number): string {
  return `${mi.toLocaleString("en-US", { maximumFractionDigits: 1 })} mi`;
}

export function formatFeet(ft: number): string {
  return `${Math.round(ft).toLocaleString("en-US")} ft`;
}
