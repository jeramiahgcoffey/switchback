/**
 * Rig presets. The Garage lets users pick one or edit specs; the chosen
 * rig persists to localStorage via `useActiveRig()` in lib/storage.ts.
 */
import type { RigProfile } from "@/lib/types";

export const rigs = [
  {
    id: "rig-stock-sport",
    name: "Stock Wrangler Sport",
    vehicle: "Jeep Wrangler Sport 2-Door",
    tireIn: 31,
    clearanceIn: 9.7,
    hasWinch: false,
    hasLockers: false,
    hasFourLo: true,
    fuelRangeMiles: 350,
    payloadLbs: 1000,
  },
  {
    id: "rig-built-rubicon",
    name: "Built Rubicon",
    vehicle: "Jeep Wrangler Rubicon 4-Door (lifted)",
    tireIn: 35,
    clearanceIn: 11,
    hasWinch: true,
    hasLockers: true,
    hasFourLo: true,
    fuelRangeMiles: 400,
    payloadLbs: 900,
  },
  {
    id: "rig-gladiator-mojave",
    name: "Gladiator Mojave Overland",
    vehicle: "Jeep Gladiator Mojave (overland build)",
    tireIn: 33,
    clearanceIn: 11.6,
    hasWinch: true,
    hasLockers: true,
    hasFourLo: true,
    fuelRangeMiles: 480,
    payloadLbs: 1325,
  },
] satisfies RigProfile[];

export const DEFAULT_RIG_ID = "rig-stock-sport";

export function getRigById(id: string): RigProfile | undefined {
  return rigs.find((r) => r.id === id);
}
