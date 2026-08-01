import { describe, expect, it } from "vitest";
import {
  DEPARTURE_CHECKS,
  countCompleted,
  createOfflineFieldState,
  fieldKitPaths,
  normalizeOfflineFieldState,
  offlineFieldStorageKey,
} from "@/lib/offline-field";
import type { TripPlan } from "@/lib/types";

const plan: TripPlan = {
  id: "trip-field-test",
  trailSlug: "white-rim-trail",
  startDate: "2026-10-02",
  partySize: 2,
  rigId: "rig-stock-sport",
  days: [],
  checklist: { "gear-first-aid": true },
  createdAt: "2026-07-31T12:00:00.000Z",
};

describe("offline field state", () => {
  it("creates an isolated field checklist from the packet snapshot", () => {
    const state = createOfflineFieldState(plan);
    state.checklist["gear-first-aid"] = false;

    expect(plan.checklist["gear-first-aid"]).toBe(true);
    expect(state).toMatchObject({
      schemaVersion: 1,
      cachedAt: null,
      updatedAt: plan.createdAt,
    });
  });

  it("builds a bounded field kit and stable storage key", () => {
    expect(fieldKitPaths("/plan/packet/trip-field-test", plan.trailSlug)).toEqual([
      "/plan/packet/trip-field-test",
      "/trails/white-rim-trail",
      "/plan",
      "/offline",
    ]);
    expect(offlineFieldStorageKey(plan.id)).toBe(
      "switchback:field:v1:trip-field-test",
    );
  });

  it("counts only known completion ids", () => {
    const ids = DEPARTURE_CHECKS.map((item) => item.id);
    expect(countCompleted({ weather: true, permits: true, unknown: true }, ids)).toBe(
      2,
    );
  });

  it("repairs partial device state from older field-mode drafts", () => {
    const fallback = createOfflineFieldState(plan);
    expect(
      normalizeOfflineFieldState(
        { checklist: { "gear-first-aid": false }, cachedAt: "invalid-draft" },
        fallback,
      ),
    ).toMatchObject({
      schemaVersion: 1,
      checklist: { "gear-first-aid": false },
      departureChecks: {},
      cachedAt: "invalid-draft",
      updatedAt: plan.createdAt,
    });
  });
});
