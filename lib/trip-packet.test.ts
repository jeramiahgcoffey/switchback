import { describe, expect, it } from "vitest";
import { getTrailBySlug } from "@/lib/data/trails";
import { splitIntoDays } from "@/lib/derive";
import { buildTripPacket } from "@/lib/trip-packet";
import type { TripPlan } from "@/lib/types";

function savedTrip(): TripPlan {
  const trail = getTrailBySlug("white-rim-trail");
  if (!trail) throw new Error("White Rim Trail fixture is missing");
  return {
    id: "trip-field-test",
    name: "Desert Loop",
    trailSlug: trail.slug,
    startDate: "2026-10-02",
    partySize: 3,
    rigId: "rig-stock-sport",
    rigSnapshot: {
      buildId: "weekend-rig",
      buildName: "Weekend Rig",
      profile: {
        id: "rig-stock-sport",
        name: "Frozen Wrangler",
        vehicle: "2024 Jeep Wrangler Sport",
        tireIn: 37,
        clearanceIn: 12,
        hasWinch: true,
        hasLockers: true,
        hasFourLo: true,
        fuelRangeMiles: 500,
        payloadLbs: 1000,
      },
      gearIds: ["gear-first-aid"],
    },
    days: splitIntoDays(trail, 3),
    checklist: {
      "gear-first-aid": true,
      "gear-headlamp": true,
    },
    fieldNotes: {
      tripLeader: "Mara",
      emergencyContact: "Basecamp",
    },
    createdAt: "2026-07-27T12:00:00.000Z",
  };
}

describe("buildTripPacket", () => {
  it("builds itinerary, fuel, waypoint, and packing sections from the saved snapshot", () => {
    const packet = buildTripPacket(savedTrip());

    expect(packet).not.toBeNull();
    expect(packet?.rigSnapshot.profile.name).toBe("Frozen Wrangler");
    expect(packet?.days).toHaveLength(3);
    expect(packet?.days[0].start?.kind).toBe("trailhead");
    expect(packet?.days.at(-1)?.end?.kind).toBe("exit");
    expect(packet?.fuel.ok).toBe(true);
    expect(packet?.waypoints.length).toBeGreaterThan(3);
    expect(packet?.gearGroups.length).toBeGreaterThan(4);
    expect(packet?.totals).toMatchObject({
      checkedItems: 2,
      nights: 2,
    });
    expect(packet?.suggestedLoadout.totalLbs).toBeGreaterThan(
      packet?.packedLoadout.totalLbs ?? Infinity,
    );
  });

  it("falls back to a preset snapshot for legacy saved trips", () => {
    const plan = savedTrip();
    delete plan.rigSnapshot;

    const packet = buildTripPacket(plan);

    expect(packet?.rigSnapshot.profile.id).toBe("rig-stock-sport");
    expect(packet?.rigSnapshot.buildName).toBeTruthy();
  });

  it("returns null when the saved trail no longer exists", () => {
    expect(
      buildTripPacket({ ...savedTrip(), trailSlug: "retired-route" }),
    ).toBeNull();
  });
});
