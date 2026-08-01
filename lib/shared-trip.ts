import { getRigById, rigs } from "@/lib/data/rigs";
import { getTrailBySlug } from "@/lib/data/trails";
import { sanitizeTripPlan } from "@/lib/profile-sanitize";
import { snapshotPreset } from "@/lib/rig-library";
import type { TripPlan } from "@/lib/types";

export const SHARED_TRIP_SCHEMA_VERSION = 1 as const;
export const SHARE_EXPIRY_DAYS = [7, 30] as const;
export const SHARE_ID_PATTERN = /^[A-Za-z0-9_-]{24}$/;

export type ShareExpiryDays = (typeof SHARE_EXPIRY_DAYS)[number] | null;

export interface SharedTripSnapshot {
  schemaVersion: typeof SHARED_TRIP_SCHEMA_VERSION;
  plan: TripPlan;
}

export interface SharedTripOwnerDTO {
  shareId: string;
  sourceTripId: string;
  title: string;
  trailSlug: string;
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  viewCount: number;
  lastViewedAt: string | null;
}

export interface SharedTripPublicDTO {
  plan: TripPlan;
  createdAt: string;
  expiresAt: string | null;
}

export interface CreateSharedTripInput {
  plan: TripPlan;
  expiresInDays: ShareExpiryDays;
  includeFieldNotes: boolean;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** Parse the only supported expiry choices. `undefined` means invalid input. */
export function parseShareExpiry(value: unknown): ShareExpiryDays | undefined {
  if (value === null) return null;
  return SHARE_EXPIRY_DAYS.find((days) => days === value);
}

/** Public share ids are fixed-width, URL-safe random tokens. */
export function isShareId(value: string): boolean {
  return SHARE_ID_PATTERN.test(value);
}

/**
 * Whitelist and freeze a client-supplied saved trip for public sharing.
 * Account data never enters this function. Field notes are opt-in because they
 * can contain phone, medical, permit, or meetup details.
 */
export function parseCreateSharedTripInput(
  value: unknown,
): CreateSharedTripInput | null {
  if (!isObject(value) || typeof value.includeFieldNotes !== "boolean") {
    return null;
  }
  const expiresInDays = parseShareExpiry(value.expiresInDays);
  if (expiresInDays === undefined) return null;

  const sanitized = sanitizeTripPlan(value.plan);
  if (
    !sanitized ||
    !sanitized.id ||
    !getTrailBySlug(sanitized.trailSlug) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(sanitized.startDate) ||
    !Number.isInteger(sanitized.partySize) ||
    sanitized.partySize < 1 ||
    sanitized.partySize > 20 ||
    sanitized.days.length < 1 ||
    sanitized.days.length > 30
  ) {
    return null;
  }

  const plan: TripPlan = {
    ...sanitized,
    days: sanitized.days.map((day) => ({
      ...day,
      resupplyWaypointIds: [...day.resupplyWaypointIds],
    })),
    checklist: { ...sanitized.checklist },
  };
  delete plan.rigBuildId;

  if (sanitized.rigSnapshot) {
    plan.rigSnapshot = {
      ...sanitized.rigSnapshot,
      profile: { ...sanitized.rigSnapshot.profile },
      gearIds: [...sanitized.rigSnapshot.gearIds],
    };
  } else {
    plan.rigSnapshot = snapshotPreset(getRigById(plan.rigId) ?? rigs[0]);
  }

  if (!value.includeFieldNotes) {
    delete plan.fieldNotes;
  } else if (sanitized.fieldNotes) {
    plan.fieldNotes = { ...sanitized.fieldNotes };
  }

  return {
    plan,
    expiresInDays,
    includeFieldNotes: value.includeFieldNotes,
  };
}

/** Resolve an optional absolute expiry from an approved day count. */
export function shareExpiryDate(
  days: ShareExpiryDays,
  now: Date,
): Date | undefined {
  if (days === null) return undefined;
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}
