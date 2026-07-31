import {
  buildFuelCheck,
  buildPackingList,
  computeLoadout,
  gearItemQuantity,
  matchRigToTrail,
  type FuelCheck,
  type Loadout,
} from "@/lib/derive";
import { gear, gearCategories } from "@/lib/data/gear";
import { getRigById, rigs } from "@/lib/data/rigs";
import { getTrailBySlug } from "@/lib/data/trails";
import { snapshotPreset } from "@/lib/rig-library";
import type {
  DayPlan,
  GearCategory,
  GearItem,
  Readiness,
  Season,
  Trail,
  TripPlan,
  TripRigSnapshot,
  Waypoint,
} from "@/lib/types";

export interface TripPacketDay {
  plan: DayPlan;
  start: Waypoint | null;
  end: Waypoint | null;
  camp: Waypoint | null;
  resupply: Waypoint[];
  fuelGapMiles: number;
  exceedsRange: boolean;
}

export interface TripPacketGearItem {
  item: GearItem;
  quantity: number;
  weightLbs: number;
  checked: boolean;
}

export interface TripPacketGearGroup {
  category: GearCategory;
  items: TripPacketGearItem[];
}

export interface TripPacketData {
  plan: TripPlan;
  trail: Trail;
  rigSnapshot: TripRigSnapshot;
  readiness: Readiness;
  fuel: FuelCheck;
  days: TripPacketDay[];
  waypoints: Waypoint[];
  gearGroups: TripPacketGearGroup[];
  suggestedLoadout: Loadout;
  packedLoadout: Loadout;
  totals: {
    miles: number;
    wheelHours: number;
    nights: number;
    checkedItems: number;
    totalItems: number;
  };
}

function resolveSnapshot(plan: TripPlan): TripRigSnapshot {
  if (plan.rigSnapshot) return plan.rigSnapshot;
  const preset = getRigById(plan.rigId) ?? rigs[0];
  return snapshotPreset(preset);
}

function seasonForTripDate(iso: string): Season {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return "summer";
  const month = Number(match[2]) - 1;
  if (month === 11 || month <= 1) return "winter";
  if (month <= 4) return "spring";
  if (month <= 7) return "summer";
  return "fall";
}

/**
 * Resolve a saved TripPlan into a self-contained field packet. The plan's
 * frozen days and rig snapshot remain authoritative; current Garage edits do
 * not change a previously saved packet.
 */
export function buildTripPacket(plan: TripPlan): TripPacketData | null {
  const trail = getTrailBySlug(plan.trailSlug);
  if (!trail) return null;

  const rigSnapshot = resolveSnapshot(plan);
  const rig = rigSnapshot.profile;
  const fuel = buildFuelCheck(plan.days, trail, rig);
  const waypointById = new Map(trail.waypoints.map((waypoint) => [waypoint.id, waypoint]));
  const days = plan.days.map((day) => {
    const fuelLeg = fuel.legs.find((leg) => leg.day === day.day);
    return {
      plan: day,
      start: waypointById.get(day.startWaypointId) ?? null,
      end: waypointById.get(day.endWaypointId) ?? null,
      camp: day.campWaypointId
        ? (waypointById.get(day.campWaypointId) ?? null)
        : null,
      resupply: day.resupplyWaypointIds.flatMap((id) => {
        const waypoint = waypointById.get(id);
        return waypoint ? [waypoint] : [];
      }),
      fuelGapMiles: fuelLeg?.gapMiles ?? 0,
      exceedsRange: fuelLeg?.exceedsRange ?? false,
    };
  });

  const packingList = buildPackingList(
    trail,
    plan.days.length,
    seasonForTripDate(plan.startDate),
    plan.partySize,
    gear,
  );
  const gearGroups = gearCategories.flatMap((category) => {
    const items = packingList
      .filter((item) => item.category === category)
      .map((item) => {
        const quantity = gearItemQuantity(
          item,
          plan.partySize,
          plan.days.length,
        );
        return {
          item,
          quantity,
          weightLbs: Math.round(item.weightLbs * quantity * 10) / 10,
          checked: Boolean(plan.checklist[item.id]),
        };
      });
    return items.length ? [{ category, items }] : [];
  });
  const suggestedIds = packingList.map((item) => item.id);
  const packedIds = packingList
    .filter((item) => plan.checklist[item.id])
    .map((item) => item.id);

  return {
    plan,
    trail,
    rigSnapshot,
    readiness: matchRigToTrail(rig, trail),
    fuel,
    days,
    waypoints: [...trail.waypoints].sort(
      (left, right) => left.mileMarker - right.mileMarker,
    ),
    gearGroups,
    suggestedLoadout: computeLoadout(
      suggestedIds,
      plan.partySize,
      rig,
      gear,
      plan.days.length,
    ),
    packedLoadout: computeLoadout(
      packedIds,
      plan.partySize,
      rig,
      gear,
      plan.days.length,
    ),
    totals: {
      miles: Math.round(
        plan.days.reduce((sum, day) => sum + day.miles, 0) * 10,
      ) / 10,
      wheelHours:
        Math.round(
          plan.days.reduce((sum, day) => sum + day.estWheelHours, 0) * 10,
        ) / 10,
      nights: plan.days.filter((day) => day.campWaypointId).length,
      checkedItems: packedIds.length,
      totalItems: packingList.length,
    },
  };
}
