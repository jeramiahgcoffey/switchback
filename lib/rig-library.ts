import { DEFAULT_RIG_ID, getRigById, rigs } from "@/lib/data/rigs";
import type {
  ActiveRigState,
  RigBuild,
  RigLibraryState,
  RigProfile,
  TripRigSnapshot,
} from "@/lib/types";

export const DEFAULT_RIG_BUILD_ID = "rig-build-default";
export const MAX_RIG_BUILDS = 25;

export const DEFAULT_ACTIVE_RIG_STATE: ActiveRigState = {
  rigId: DEFAULT_RIG_ID,
  gearIds: [],
};

export const DEFAULT_RIG_LIBRARY_STATE: RigLibraryState = {
  activeRigId: DEFAULT_RIG_BUILD_ID,
  rigs: [
    {
      id: DEFAULT_RIG_BUILD_ID,
      name: "My Wrangler",
      rig: DEFAULT_ACTIVE_RIG_STATE,
      createdAt: "",
      updatedAt: "",
    },
  ],
};

export function resolveRigState(state: ActiveRigState): RigProfile {
  const preset =
    getRigById(state.rigId) ?? getRigById(DEFAULT_RIG_ID) ?? rigs[0];
  return { ...preset, ...state.customSpecs };
}

export function getActiveRigBuild(library: RigLibraryState): RigBuild {
  return (
    library.rigs.find((build) => build.id === library.activeRigId) ??
    library.rigs[0] ??
    DEFAULT_RIG_LIBRARY_STATE.rigs[0]
  );
}

export function rigLibraryFromLegacy(
  state: ActiveRigState,
  timestamp = "",
): RigLibraryState {
  const preset = resolveRigState(state);
  return {
    activeRigId: DEFAULT_RIG_BUILD_ID,
    rigs: [
      {
        id: DEFAULT_RIG_BUILD_ID,
        name: preset.name,
        rig: state,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
  };
}

export function snapshotRigBuild(build: RigBuild): TripRigSnapshot {
  return {
    buildId: build.id,
    buildName: build.name,
    profile: resolveRigState(build.rig),
    gearIds: [...build.rig.gearIds],
  };
}

export function snapshotPreset(rig: RigProfile): TripRigSnapshot {
  return {
    buildName: rig.name,
    profile: { ...rig },
    gearIds: [],
  };
}

export function newRigBuildId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `rig-build-${crypto.randomUUID()}`;
  }
  return `rig-build-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
