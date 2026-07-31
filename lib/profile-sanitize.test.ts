import { describe, expect, it } from "vitest";
import {
  MAX_PROFILE_TRIPS,
  sanitizeUserProfile,
} from "@/lib/profile-sanitize";
import { MAX_RIG_BUILDS } from "@/lib/rig-library";

const timestamp = "2026-07-27T12:00:00.000Z";

function trip(index: number) {
  return {
    id: `trip-${index}`,
    name: `Trip ${index}`,
    trailSlug: "white-rim-trail",
    startDate: "2026-10-02",
    partySize: 2,
    rigId: "rig-built-rubicon",
    days: [],
    checklist: {},
    createdAt: timestamp,
  };
}

function build(index: number) {
  return {
    id: `build-${index}`,
    name: `Build ${index}`,
    rig: {
      rigId: "rig-built-rubicon",
      gearIds: [`gear-${index}`],
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

describe("profile sanitizer", () => {
  it("keeps the newest trips and rig builds within account caps", () => {
    const rigFixtureCount = MAX_RIG_BUILDS + 2;
    const tripFixtureCount = MAX_PROFILE_TRIPS + 2;
    const activeBuildId = `build-${rigFixtureCount - 1}`;
    const profile = sanitizeUserProfile(
      {
        activeRig: { rigId: "rig-stock-sport", gearIds: [] },
        rigLibrary: {
          activeRigId: activeBuildId,
          rigs: Array.from(
            { length: rigFixtureCount },
            (_, index) => build(index),
          ),
        },
        tripPlan: null,
        trips: Array.from(
          { length: tripFixtureCount },
          (_, index) => trip(index),
        ),
        updatedAt: timestamp,
      },
      timestamp,
    );

    expect(profile.rigLibrary.rigs).toHaveLength(MAX_RIG_BUILDS);
    expect(profile.rigLibrary.rigs[0].id).toBe(
      `build-${rigFixtureCount - MAX_RIG_BUILDS}`,
    );
    expect(profile.rigLibrary.rigs.at(-1)?.id).toBe(activeBuildId);
    expect(profile.rigLibrary.activeRigId).toBe(activeBuildId);
    expect(profile.activeRig.rigId).toBe("rig-built-rubicon");

    expect(profile.trips).toHaveLength(MAX_PROFILE_TRIPS);
    expect(profile.trips[0].id).toBe(
      `trip-${tripFixtureCount - MAX_PROFILE_TRIPS}`,
    );
    expect(profile.trips.at(-1)?.id).toBe(
      `trip-${tripFixtureCount - 1}`,
    );
  });

  it("migrates a legacy profile and sanitizes trip rig snapshots", () => {
    const profile = sanitizeUserProfile(
      {
        activeRig: {
          rigId: "rig-gladiator-mojave",
          customSpecs: { tireIn: 35, injected: "drop-me" },
          gearIds: ["water"],
        },
        tripPlan: {
          ...trip(1),
          rigBuildId: "garage-build",
          rigSnapshot: {
            buildId: "garage-build",
            buildName: "Mojave",
            profile: {
              id: "rig-gladiator-mojave",
              name: "Mojave",
              vehicle: "Jeep Gladiator",
              tireIn: 35,
              clearanceIn: 11.6,
              hasWinch: true,
              hasLockers: true,
              hasFourLo: true,
              fuelRangeMiles: 480,
              payloadLbs: 1325,
              injected: "drop-me",
            },
            gearIds: ["water"],
            injected: "drop-me",
          },
        },
        trips: [],
        updatedAt: timestamp,
      },
      timestamp,
    );

    expect(profile.rigLibrary.rigs).toHaveLength(1);
    expect(profile.activeRig).toEqual({
      rigId: "rig-gladiator-mojave",
      customSpecs: { tireIn: 35 },
      gearIds: ["water"],
    });
    expect(profile.tripPlan?.rigSnapshot).toEqual({
      buildId: "garage-build",
      buildName: "Mojave",
      profile: {
        id: "rig-gladiator-mojave",
        name: "Mojave",
        vehicle: "Jeep Gladiator",
        tireIn: 35,
        clearanceIn: 11.6,
        hasWinch: true,
        hasLockers: true,
        hasFourLo: true,
        fuelRangeMiles: 480,
        payloadLbs: 1325,
      },
      gearIds: ["water"],
    });
  });

  it("repairs build timestamps and drops MongoDB-unsafe checklist keys", () => {
    const unsafeChecklist = {
      safe: true,
      "contains.dot": true,
      $operator: true,
      "": true,
      disabled: false,
    };
    const profile = sanitizeUserProfile(
      {
        activeRig: { rigId: "rig-stock-sport", gearIds: [] },
        rigLibrary: {
          activeRigId: "build-1",
          rigs: [
            {
              ...build(1),
              createdAt: "",
              updatedAt: undefined,
            },
          ],
        },
        tripPlan: {
          ...trip(1),
          checklist: unsafeChecklist,
        },
        trips: [],
        updatedAt: timestamp,
      },
      timestamp,
    );

    expect(profile.rigLibrary.rigs[0]).toMatchObject({
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    expect(profile.tripPlan?.checklist).toEqual({
      safe: true,
      disabled: false,
    });
  });

  it("whitelists and bounds trip field notes for account sync", () => {
    const profile = sanitizeUserProfile(
      {
        activeRig: { rigId: "rig-stock-sport", gearIds: [] },
        tripPlan: {
          ...trip(1),
          fieldNotes: {
            tripLeader: "Mara",
            emergencyContact: "Basecamp",
            emergencyPhone: "+1 555 0100",
            checkInBy: "2026-10-04T18:30",
            notes: "A".repeat(2500),
            injected: "drop-me",
          },
        },
        trips: [],
        updatedAt: timestamp,
      },
      timestamp,
    );

    expect(profile.tripPlan?.fieldNotes).toEqual({
      tripLeader: "Mara",
      emergencyContact: "Basecamp",
      emergencyPhone: "+1 555 0100",
      checkInBy: "2026-10-04T18:30",
      notes: "A".repeat(2000),
    });
  });
});
