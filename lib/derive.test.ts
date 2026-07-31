import { describe, expect, it } from "vitest";
import {
  computeLoadout,
  gearItemQuantity,
  matchRigToTrail,
  splitIntoDays,
} from "@/lib/derive";
import { gear, getGearById } from "@/lib/data/gear";
import { getRigById } from "@/lib/data/rigs";
import { getTrailBySlug } from "@/lib/data/trails";

describe("shared trip derivation", () => {
  const whiteRim = getTrailBySlug("white-rim-trail");
  const stock = getRigById("rig-stock-sport");
  const rubicon = getRigById("rig-built-rubicon");

  it("scores capable rigs without a hard failure on White Rim", () => {
    expect(whiteRim).toBeDefined();
    expect(stock).toBeDefined();
    expect(rubicon).toBeDefined();

    const stockReadiness = matchRigToTrail(stock!, whiteRim!);
    const rubiconReadiness = matchRigToTrail(rubicon!, whiteRim!);

    expect(stockReadiness.verdict).not.toBe("no-go");
    expect(rubiconReadiness.verdict).toBe("go");
    expect(rubiconReadiness.reasons).toHaveLength(6);
  });

  it("builds contiguous campsite-anchored itinerary days", () => {
    expect(whiteRim).toBeDefined();
    const days = splitIntoDays(whiteRim!, 3);

    expect(days).toHaveLength(3);
    expect(days[0].day).toBe(1);
    expect(days[1].startWaypointId).toBe(days[0].endWaypointId);
    expect(days[2].startWaypointId).toBe(days[1].endWaypointId);
    expect(days.reduce((sum, day) => sum + day.miles, 0)).toBe(
      whiteRim!.distanceMiles,
    );
  });

  it("scales per-day water across both the crew and trip length", () => {
    const water = getGearById("gear-drinking-water");
    expect(water).toBeDefined();
    expect(gearItemQuantity(water!, 3, 3)).toBe(9);

    const loadout = computeLoadout(
      [water!.id],
      3,
      rubicon!,
      gear,
      3,
    );
    expect(loadout.totalLbs).toBe(74.7);
  });
});
