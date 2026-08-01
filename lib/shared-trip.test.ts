import { describe, expect, it } from "vitest";
import { getTrailBySlug } from "@/lib/data/trails";
import { splitIntoDays } from "@/lib/derive";
import {
  isShareId,
  parseCreateSharedTripInput,
  parseShareExpiry,
  shareExpiryDate,
} from "@/lib/shared-trip";
import type { TripPlan } from "@/lib/types";

function savedTrip(): TripPlan {
  const trail = getTrailBySlug("white-rim-trail");
  if (!trail) throw new Error("White Rim Trail fixture is missing");
  return {
    id: "trip-share-test",
    name: "Desert Dispatch",
    trailSlug: trail.slug,
    startDate: "2026-10-02",
    partySize: 3,
    rigId: "rig-stock-sport",
    rigBuildId: "private-garage-id",
    days: splitIntoDays(trail, 3),
    checklist: { "gear-first-aid": true },
    fieldNotes: {
      tripLeader: "Mara",
      emergencyPhone: "+1 555 0100",
      notes: "Medical and permit details",
    },
    createdAt: "2026-07-31T12:00:00.000Z",
  };
}

describe("shared trip input", () => {
  it("freezes a legacy rig and excludes private field notes by default", () => {
    const parsed = parseCreateSharedTripInput({
      plan: savedTrip(),
      expiresInDays: 30,
      includeFieldNotes: false,
    });

    expect(parsed?.plan.rigSnapshot?.profile.id).toBe("rig-stock-sport");
    expect(parsed?.plan.rigBuildId).toBeUndefined();
    expect(parsed?.plan.fieldNotes).toBeUndefined();
  });

  it("includes sanitized field notes only after explicit opt-in", () => {
    const parsed = parseCreateSharedTripInput({
      plan: savedTrip(),
      expiresInDays: null,
      includeFieldNotes: true,
    });

    expect(parsed?.plan.fieldNotes).toMatchObject({
      tripLeader: "Mara",
      emergencyPhone: "+1 555 0100",
    });
  });

  it("rejects unsupported expiry and implausible party sizes", () => {
    expect(parseShareExpiry(14)).toBeUndefined();
    expect(
      parseCreateSharedTripInput({
        plan: { ...savedTrip(), partySize: 200 },
        expiresInDays: 7,
        includeFieldNotes: false,
      }),
    ).toBeNull();
  });

  it("uses fixed-width URL-safe share ids and exact expiry dates", () => {
    expect(isShareId("AbCdEf0123456789_-abCDef")).toBe(true);
    expect(isShareId("short-token")).toBe(false);
    expect(
      shareExpiryDate(7, new Date("2026-07-31T12:00:00.000Z"))?.toISOString(),
    ).toBe("2026-08-07T12:00:00.000Z");
    expect(shareExpiryDate(null, new Date())).toBeUndefined();
  });
});
