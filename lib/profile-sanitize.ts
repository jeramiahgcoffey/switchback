import {
  MAX_RIG_BUILDS,
  getActiveRigBuild,
  resolveRigState,
  rigLibraryFromLegacy,
} from "@/lib/rig-library";
import type {
  ActiveRigState,
  RigBuild,
  RigLibraryState,
  RigProfile,
  TripPlan,
  TripFieldNotes,
  TripRigSnapshot,
  UserProfile,
} from "@/lib/types";

export const MAX_PROFILE_TRIPS = 50;
const MAX_GEAR_IDS = 500;
const MAX_DAYS = 60;
const MAX_CHECKLIST_KEYS = 1000;
const MAX_STR = 256;
const MAX_NOTES_STR = 2000;

const isObj = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const str = (value: unknown): value is string => typeof value === "string";
const num = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const bool = (value: unknown): value is boolean =>
  typeof value === "boolean";
const capStr = (value: unknown, fallback = ""): string =>
  str(value) ? value.slice(0, MAX_STR) : fallback;

function sanitizeCustomSpecs(
  value: unknown,
): ActiveRigState["customSpecs"] | undefined {
  if (!isObj(value)) return undefined;
  const out: Record<string, number | boolean> = {};
  for (const key of [
    "tireIn",
    "clearanceIn",
    "fuelRangeMiles",
    "payloadLbs",
  ]) {
    if (num(value[key])) out[key] = value[key] as number;
  }
  for (const key of ["hasWinch", "hasLockers", "hasFourLo"]) {
    if (bool(value[key])) out[key] = value[key] as boolean;
  }
  return Object.keys(out).length
    ? (out as ActiveRigState["customSpecs"])
    : undefined;
}

export function sanitizeActiveRig(value: unknown): ActiveRigState {
  if (!isObj(value) || !str(value.rigId)) {
    return { rigId: "rig-stock-sport", gearIds: [] };
  }
  const gearIds = Array.isArray(value.gearIds)
    ? value.gearIds
        .filter(str)
        .slice(0, MAX_GEAR_IDS)
        .map((id) => id.slice(0, MAX_STR))
    : [];
  const rig: ActiveRigState = { rigId: capStr(value.rigId), gearIds };
  const specs = sanitizeCustomSpecs(value.customSpecs);
  if (specs) rig.customSpecs = specs;
  return rig;
}

function sanitizeRigProfile(value: unknown): RigProfile | null {
  if (!isObj(value) || !str(value.id)) return null;
  return {
    id: capStr(value.id),
    name: capStr(value.name),
    vehicle: capStr(value.vehicle),
    tireIn: num(value.tireIn) ? value.tireIn : 0,
    clearanceIn: num(value.clearanceIn) ? value.clearanceIn : 0,
    hasWinch: bool(value.hasWinch) ? value.hasWinch : false,
    hasLockers: bool(value.hasLockers) ? value.hasLockers : false,
    hasFourLo: bool(value.hasFourLo) ? value.hasFourLo : false,
    fuelRangeMiles: num(value.fuelRangeMiles) ? value.fuelRangeMiles : 0,
    payloadLbs: num(value.payloadLbs) ? value.payloadLbs : 0,
  };
}

function sanitizeRigSnapshot(value: unknown): TripRigSnapshot | undefined {
  if (!isObj(value)) return undefined;
  const profile = sanitizeRigProfile(value.profile);
  if (!profile) return undefined;
  return {
    ...(str(value.buildId) ? { buildId: capStr(value.buildId) } : {}),
    buildName: capStr(value.buildName, profile.name),
    profile,
    gearIds: Array.isArray(value.gearIds)
      ? value.gearIds
          .filter(str)
          .slice(0, MAX_GEAR_IDS)
          .map((id) => id.slice(0, MAX_STR))
      : [],
  };
}

function sanitizeFieldNotes(value: unknown): TripFieldNotes | undefined {
  if (!isObj(value)) return undefined;
  const notes: TripFieldNotes = {};
  for (const key of [
    "tripLeader",
    "emergencyContact",
    "emergencyPhone",
    "checkInBy",
  ] as const) {
    if (str(value[key])) notes[key] = value[key].slice(0, MAX_STR);
  }
  if (str(value.notes)) notes.notes = value.notes.slice(0, MAX_NOTES_STR);
  return Object.values(notes).some(Boolean) ? notes : undefined;
}

function sanitizeRigBuild(
  value: unknown,
  timestamp: string,
): RigBuild | null {
  if (!isObj(value) || !str(value.id)) return null;
  const rig = sanitizeActiveRig(value.rig);
  return {
    id: capStr(value.id),
    name: capStr(value.name, resolveRigState(rig).name),
    rig,
    createdAt: capStr(value.createdAt) || timestamp,
    updatedAt: capStr(value.updatedAt) || timestamp,
  };
}

export function sanitizeRigLibrary(
  value: unknown,
  legacyRig: ActiveRigState,
  timestamp = "",
): RigLibraryState {
  if (!isObj(value) || !Array.isArray(value.rigs)) {
    return rigLibraryFromLegacy(legacyRig, timestamp);
  }

  const builds: RigBuild[] = [];
  const ids = new Set<string>();
  for (
    let index = value.rigs.length - 1;
    index >= 0 && builds.length < MAX_RIG_BUILDS;
    index -= 1
  ) {
    const build = sanitizeRigBuild(value.rigs[index], timestamp);
    if (build && !ids.has(build.id)) {
      ids.add(build.id);
      builds.push(build);
    }
  }
  builds.reverse();
  if (builds.length === 0) {
    return rigLibraryFromLegacy(legacyRig, timestamp);
  }

  const wantedActiveId = capStr(value.activeRigId);
  return {
    activeRigId: builds.some((build) => build.id === wantedActiveId)
      ? wantedActiveId
      : builds[builds.length - 1].id,
    rigs: builds,
  };
}

export function sanitizeTripPlan(value: unknown): TripPlan | null {
  if (!isObj(value)) return null;
  if (!str(value.trailSlug) || !Array.isArray(value.days)) return null;
  const days = value.days
    .slice(0, MAX_DAYS)
    .map((rawDay): TripPlan["days"][number] => {
      const day = isObj(rawDay) ? rawDay : {};
      return {
        day: num(day.day) ? day.day : 0,
        startWaypointId: capStr(day.startWaypointId),
        endWaypointId: capStr(day.endWaypointId),
        miles: num(day.miles) ? day.miles : 0,
        estWheelHours: num(day.estWheelHours) ? day.estWheelHours : 0,
        campWaypointId: str(day.campWaypointId)
          ? day.campWaypointId.slice(0, MAX_STR)
          : null,
        resupplyWaypointIds: Array.isArray(day.resupplyWaypointIds)
          ? day.resupplyWaypointIds
              .filter(str)
              .slice(0, MAX_DAYS)
              .map((id) => id.slice(0, MAX_STR))
          : [],
      };
    });
  const checklist: Record<string, boolean> = {};
  if (isObj(value.checklist)) {
    let kept = 0;
    for (const key in value.checklist) {
      if (
        !Object.prototype.hasOwnProperty.call(value.checklist, key) ||
        !bool(value.checklist[key])
      ) {
        continue;
      }
      const safeKey = key.slice(0, MAX_STR);
      if (
        !safeKey ||
        safeKey.startsWith("$") ||
        safeKey.includes(".") ||
        safeKey.includes("\0") ||
        Object.prototype.hasOwnProperty.call(checklist, safeKey)
      ) {
        continue;
      }
      checklist[safeKey] = value.checklist[key];
      kept += 1;
      if (kept >= MAX_CHECKLIST_KEYS) break;
    }
  }
  const plan: TripPlan = {
    id: capStr(value.id),
    trailSlug: capStr(value.trailSlug),
    startDate: capStr(value.startDate),
    partySize: num(value.partySize) ? value.partySize : 1,
    rigId: capStr(value.rigId),
    days,
    checklist,
    createdAt: capStr(value.createdAt),
  };
  if (str(value.name)) plan.name = value.name.slice(0, MAX_STR);
  if (str(value.rigBuildId)) {
    plan.rigBuildId = value.rigBuildId.slice(0, MAX_STR);
  }
  const snapshot = sanitizeRigSnapshot(value.rigSnapshot);
  if (snapshot) plan.rigSnapshot = snapshot;
  const fieldNotes = sanitizeFieldNotes(value.fieldNotes);
  if (fieldNotes) plan.fieldNotes = fieldNotes;
  return plan;
}

export function sanitizeTrips(value: unknown): TripPlan[] {
  if (!Array.isArray(value)) return [];
  const out: TripPlan[] = [];
  for (
    let index = value.length - 1;
    index >= 0 && out.length < MAX_PROFILE_TRIPS;
    index -= 1
  ) {
    const trip = sanitizeTripPlan(value[index]);
    if (trip) out.push(trip);
  }
  return out.reverse();
}

export function sanitizeUserProfile(
  value: Record<string, unknown>,
  now = new Date().toISOString(),
): UserProfile {
  const updatedAt = capStr(value.updatedAt) || now;
  const legacyRig = sanitizeActiveRig(value.activeRig);
  const rigLibrary = sanitizeRigLibrary(
    value.rigLibrary,
    legacyRig,
    updatedAt,
  );
  return {
    rigLibrary,
    activeRig: getActiveRigBuild(rigLibrary).rig,
    tripPlan: sanitizeTripPlan(value.tripPlan),
    trips: sanitizeTrips(value.trips),
    updatedAt,
  };
}

export function isProfileBody(
  value: unknown,
): value is Record<string, unknown> {
  return isObj(value);
}
