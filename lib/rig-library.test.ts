import { describe, expect, it } from "vitest";
import {
  DEFAULT_RIG_BUILD_ID,
  getActiveRigBuild,
  rigLibraryFromLegacy,
  snapshotRigBuild,
} from "@/lib/rig-library";

describe("rig library", () => {
  it("migrates the legacy active rig into a named build", () => {
    const library = rigLibraryFromLegacy(
      {
        rigId: "rig-built-rubicon",
        customSpecs: { fuelRangeMiles: 525 },
        gearIds: ["gear-winch", "gear-water"],
      },
      "2026-07-27T12:00:00.000Z",
    );

    expect(library.activeRigId).toBe(DEFAULT_RIG_BUILD_ID);
    expect(library.rigs).toHaveLength(1);
    expect(getActiveRigBuild(library)).toMatchObject({
      name: "Built Rubicon",
      rig: {
        rigId: "rig-built-rubicon",
        customSpecs: { fuelRangeMiles: 525 },
        gearIds: ["gear-winch", "gear-water"],
      },
    });
  });

  it("creates a detached trip snapshot from a saved build", () => {
    const build = {
      id: "weekend-rig",
      name: "Weekend Rubicon",
      rig: {
        rigId: "rig-built-rubicon",
        customSpecs: { tireIn: 37 },
        gearIds: ["gear-water"],
      },
      createdAt: "2026-07-27T12:00:00.000Z",
      updatedAt: "2026-07-27T12:00:00.000Z",
    };

    const snapshot = snapshotRigBuild(build);
    build.rig.customSpecs.tireIn = 33;
    build.rig.gearIds.push("gear-tools");

    expect(snapshot).toMatchObject({
      buildId: "weekend-rig",
      buildName: "Weekend Rubicon",
      profile: { id: "rig-built-rubicon", tireIn: 37 },
      gearIds: ["gear-water"],
    });
  });
});
