import type { TripPlan } from "@/lib/types";

export const OFFLINE_FIELD_SCHEMA_VERSION = 1 as const;
export const OFFLINE_FIELD_STORAGE_PREFIX = "switchback:field:v1:";

export const DEPARTURE_CHECKS = [
  {
    id: "route-status",
    label: "Official route status, seasonal gates, and land-manager closures checked",
  },
  {
    id: "weather",
    label: "Weather, flash-flood, avalanche, and fire restrictions checked",
  },
  {
    id: "permits",
    label: "Permits, passes, camping rules, and vehicle requirements confirmed",
  },
  {
    id: "navigation",
    label: "Offline navigation downloaded and paper backup packed",
  },
  {
    id: "crew-plan",
    label: "Fuel, water, and emergency contact plan confirmed with the crew",
  },
  {
    id: "contact-copy",
    label: "Trip packet left with the off-trail emergency contact",
  },
] as const;

export interface OfflineFieldState {
  schemaVersion: typeof OFFLINE_FIELD_SCHEMA_VERSION;
  checklist: Record<string, boolean>;
  departureChecks: Record<string, boolean>;
  cachedAt: string | null;
  updatedAt: string;
}

export type OfflineWorkerAction =
  | "CACHE_FIELD_KIT"
  | "DELETE_FIELD_KIT"
  | "STATUS_FIELD_KIT";

export interface OfflineWorkerRequest {
  action: OfflineWorkerAction;
  paths: string[];
}

export interface OfflineWorkerResponse {
  ok: boolean;
  cached?: boolean;
  error?: string;
}

export function offlineFieldStorageKey(packetId: string): string {
  return `${OFFLINE_FIELD_STORAGE_PREFIX}${packetId}`;
}

export function createOfflineFieldState(plan: TripPlan): OfflineFieldState {
  return {
    schemaVersion: OFFLINE_FIELD_SCHEMA_VERSION,
    checklist: { ...plan.checklist },
    departureChecks: {},
    cachedAt: null,
    updatedAt: plan.createdAt,
  };
}

/** Repair older or partially written device state without discarding valid checks. */
export function normalizeOfflineFieldState(
  value: unknown,
  fallback: OfflineFieldState,
): OfflineFieldState {
  if (typeof value !== "object" || value === null) return fallback;
  const candidate = value as Partial<OfflineFieldState>;
  const checklist =
    typeof candidate.checklist === "object" && candidate.checklist !== null
      ? candidate.checklist
      : fallback.checklist;
  const departureChecks =
    typeof candidate.departureChecks === "object" &&
    candidate.departureChecks !== null
      ? candidate.departureChecks
      : fallback.departureChecks;
  return {
    schemaVersion: OFFLINE_FIELD_SCHEMA_VERSION,
    checklist: { ...checklist },
    departureChecks: { ...departureChecks },
    cachedAt: typeof candidate.cachedAt === "string" ? candidate.cachedAt : null,
    updatedAt:
      typeof candidate.updatedAt === "string"
        ? candidate.updatedAt
        : fallback.updatedAt,
  };
}

export function fieldKitPaths(packetPath: string, trailSlug: string): string[] {
  return [packetPath, `/trails/${trailSlug}`, "/plan", "/offline"];
}

export function countCompleted(
  checks: Record<string, boolean>,
  ids: readonly string[],
): number {
  return ids.filter((id) => checks[id]).length;
}
