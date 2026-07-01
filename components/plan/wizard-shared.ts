/**
 * Trip Wizard shared helpers: pure functions and types used across the
 * three wizard steps. No React, no side effects.
 */
import type { Season, Trail } from "@/lib/types";

export type WizardStep = 1 | 2 | 3;

/**
 * Wizard UI position, persisted separately from the plan itself (which
 * lives under `switchback:plan:v1`) so a reload resumes on the exact step.
 */
export const PLAN_STEP_STORAGE_KEY = "switchback:plan:step:v1";

/** The wizard's working copy of the plan; written through to storage. */
export interface PlanDraft {
  id: string;
  createdAt: string;
  trailSlug: string | null;
  /** ISO date, e.g. "2026-07-04". */
  startDate: string;
  partySize: number;
  rigId: string;
  targetDays: number;
  /** GearItem id -> checked. */
  checklist: Record<string, boolean>;
}

export function newPlanId(): string {
  return `plan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Parse "YYYY-MM-DD" as a *local* date (no UTC midnight shift). */
export function parseLocalDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toISODate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Default departure: the upcoming Friday (always in the future). */
export function nextFridayISO(): string {
  const d = new Date();
  let add = (5 - d.getDay() + 7) % 7;
  if (add === 0) add = 7;
  d.setDate(d.getDate() + add);
  return toISODate(d);
}

/** Meteorological season for a trip start date. */
export function seasonForDate(iso: string): Season {
  const d = parseLocalDate(iso);
  if (!d) return "summer";
  const m = d.getMonth(); // 0-11
  if (m === 11 || m <= 1) return "winter";
  if (m <= 4) return "spring";
  if (m <= 7) return "summer";
  return "fall";
}

export const SEASON_LABEL: Record<Season, string> = {
  spring: "Spring",
  summer: "Summer",
  fall: "Fall",
  winter: "Winter",
};

/** "Fri, Jul 4" for day N of the trip (0-indexed offset). */
export function formatTripDate(startISO: string, dayOffset: number): string {
  const d = parseLocalDate(startISO);
  if (!d) return "";
  d.setDate(d.getDate() + dayOffset);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Decimal wheel hours as an instrument readout, e.g. "5.4 hr". */
export function formatWheelHours(h: number): string {
  return `${h.toLocaleString("en-US", { maximumFractionDigits: 1 })} hr`;
}

/**
 * Upper bound for the day-split stepper: one leg per campsite plus the
 * final push to the exit, asking for more days than campsites exist
 * would silently produce shorter itineraries.
 */
export function maxSplitDays(trail: Trail): number {
  const camps = trail.waypoints.filter((w) => w.kind === "campsite").length;
  return Math.max(1, Math.min(camps + 1, 7));
}

export function clampTargetDays(trail: Trail, wanted: number): number {
  return Math.min(Math.max(1, Math.round(wanted)), maxSplitDays(trail));
}
