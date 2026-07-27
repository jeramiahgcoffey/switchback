"use client";

/**
 * Shared client-side persistence. One typed localStorage hook with
 * SSR/hydration guards, plus the two app-level wrappers every feature
 * surface shares: the active rig ('switchback:rig:v1') and the trip plan
 * ('switchback:plan:v1').
 *
 * Built on `useSyncExternalStore`, so:
 * - the server render and the first client render always see `fallback`
 *   (no hydration mismatch) — check `hydrated` before trusting user state;
 * - writes broadcast to every subscribed component in the same tab, and the
 *   'storage' event keeps other tabs in sync.
 *
 * NOTE: pass a stable `fallback` (module constant or `null`), not an inline
 * object literal, or the snapshot identity will churn.
 */

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import type {
  ActiveRigState,
  RigBuild,
  RigLibraryState,
  RigProfile,
  TripPlan,
} from "@/lib/types";
import {
  DEFAULT_ACTIVE_RIG_STATE,
  DEFAULT_RIG_LIBRARY_STATE,
  MAX_RIG_BUILDS,
  getActiveRigBuild,
  newRigBuildId,
  resolveRigState,
  rigLibraryFromLegacy,
} from "@/lib/rig-library";

// Re-exported so existing consumers can keep importing it from here.
export type { ActiveRigState } from "@/lib/types";

export const RIG_STORAGE_KEY = "switchback:rig:v1";
export const RIG_LIBRARY_STORAGE_KEY = "switchback:rig-library:v1";
export const PLAN_STORAGE_KEY = "switchback:plan:v1";
/** The saved-trip library (multi-trip): an array of full TripPlans by id. */
export const TRIPS_STORAGE_KEY = "switchback:trips:v1";
/** ISO timestamp of the last user edit to rig/plan; owned by AccountSync. */
export const SYNC_UPDATED_AT_KEY = "switchback:updatedAt:v1";

/** Same-tab change notification (the native 'storage' event is cross-tab only). */
const LOCAL_EVENT = "switchback:storage";

function notifyKeyChanged(key: string) {
  window.dispatchEvent(new CustomEvent<string>(LOCAL_EVENT, { detail: key }));
}

function safeRead(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

const emptySubscribe = () => () => {};

/** False on the server and during hydration, true once the client owns the tree. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

export function useLocalStorage<T>(
  key: string,
  fallback: T,
): [T, (next: T | ((prev: T) => T)) => void, { hydrated: boolean; clear: () => void }] {
  // Cache the parsed value per (key, raw) so getSnapshot returns a stable
  // reference between store changes.
  const cache = useRef<{ key: string; raw: string; value: T } | null>(null);

  const subscribe = useCallback(
    (onChange: () => void) => {
      const onStorage = (e: StorageEvent) => {
        if (e.key === null || e.key === key) onChange();
      };
      const onLocal = (e: Event) => {
        if ((e as CustomEvent<string>).detail === key) onChange();
      };
      window.addEventListener("storage", onStorage);
      window.addEventListener(LOCAL_EVENT, onLocal);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(LOCAL_EVENT, onLocal);
      };
    },
    [key],
  );

  const getSnapshot = useCallback((): T => {
    const raw = safeRead(key);
    if (raw === null) return fallback;
    if (!cache.current || cache.current.key !== key || cache.current.raw !== raw) {
      try {
        cache.current = { key, raw, value: JSON.parse(raw) as T };
      } catch {
        // Corrupt entry — treat as unset.
        return fallback;
      }
    }
    return cache.current.value;
  }, [key, fallback]);

  const getServerSnapshot = useCallback((): T => fallback, [fallback]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hydrated = useHydrated();

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prevRaw = safeRead(key);
      let prev = fallback;
      if (prevRaw !== null) {
        try {
          prev = JSON.parse(prevRaw) as T;
        } catch {
          // keep fallback
        }
      }
      const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      try {
        window.localStorage.setItem(key, JSON.stringify(resolved));
      } catch {
        // Storage full/blocked — nothing to persist.
      }
      notifyKeyChanged(key);
    },
    [key, fallback],
  );

  const clear = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
    notifyKeyChanged(key);
  }, [key]);

  return [value, set, { hydrated, clear }];
}

// ---------------------------------------------------------------------------
// Rig library — key 'switchback:rig-library:v1'
// ---------------------------------------------------------------------------

export { DEFAULT_ACTIVE_RIG_STATE } from "@/lib/rig-library";

function readLegacyRig(): ActiveRigState | null {
  const raw = safeRead(RIG_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ActiveRigState;
  } catch {
    return null;
  }
}

// Many readiness components can mount useActiveRig at once. Only the first
// hook instance needs to perform the one-time legacy write.
let legacyMigrationStarted = false;

export function useRigLibrary(): {
  library: RigLibraryState;
  activeBuild: RigBuild;
  setLibrary: (
    next:
      | RigLibraryState
      | ((prev: RigLibraryState) => RigLibraryState),
  ) => void;
  updateActiveRig: (
    next: ActiveRigState | ((prev: ActiveRigState) => ActiveRigState),
  ) => void;
  createRig: () => void;
  duplicateRig: (id: string) => void;
  activateRig: (id: string) => void;
  renameRig: (id: string, name: string) => void;
  removeRig: (id: string) => void;
  hydrated: boolean;
} {
  const [library, setLibrary, { hydrated }] =
    useLocalStorage<RigLibraryState>(
      RIG_LIBRARY_STORAGE_KEY,
      DEFAULT_RIG_LIBRARY_STATE,
    );
  const hasLibrary = hydrated && safeRead(RIG_LIBRARY_STORAGE_KEY) !== null;
  const legacyRig = hydrated && !hasLibrary ? readLegacyRig() : null;
  const migrationPending = hydrated && !hasLibrary && legacyRig !== null;

  useEffect(() => {
    if (!migrationPending || !legacyRig || legacyMigrationStarted) return;
    legacyMigrationStarted = true;
    setLibrary(rigLibraryFromLegacy(legacyRig, new Date().toISOString()));
  }, [legacyRig, migrationPending, setLibrary]);

  const activeBuild = getActiveRigBuild(library);
  const ready = hydrated && !migrationPending;

  useEffect(() => {
    if (
      !ready ||
      library.rigs.length === 0 ||
      activeBuild.id === library.activeRigId
    ) {
      return;
    }
    setLibrary((prev) => {
      if (prev.rigs.length === 0) return prev;
      const resolved = getActiveRigBuild(prev);
      return resolved.id === prev.activeRigId
        ? prev
        : { ...prev, activeRigId: resolved.id };
    });
  }, [
    ready,
    activeBuild.id,
    library.activeRigId,
    library.rigs.length,
    setLibrary,
  ]);

  const updateActiveRig = useCallback(
    (next: ActiveRigState | ((prev: ActiveRigState) => ActiveRigState)) => {
      setLibrary((prev) => {
        const active = getActiveRigBuild(prev);
        const rig =
          typeof next === "function"
            ? (next as (value: ActiveRigState) => ActiveRigState)(active.rig)
            : next;
        const timestamp = new Date().toISOString();
        return {
          ...prev,
          rigs: prev.rigs.map((build) =>
            build.id === active.id
              ? { ...build, rig, updatedAt: timestamp }
              : build,
          ),
        };
      });
    },
    [setLibrary],
  );

  const createRig = useCallback(() => {
    setLibrary((prev) => {
      if (prev.rigs.length >= MAX_RIG_BUILDS) return prev;
      const timestamp = new Date().toISOString();
      const id = newRigBuildId();
      const build: RigBuild = {
        id,
        name: `Rig ${prev.rigs.length + 1}`,
        rig: { ...DEFAULT_ACTIVE_RIG_STATE, gearIds: [] },
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      return { activeRigId: id, rigs: [...prev.rigs, build] };
    });
  }, [setLibrary]);

  const duplicateRig = useCallback(
    (id: string) => {
      setLibrary((prev) => {
        if (prev.rigs.length >= MAX_RIG_BUILDS) return prev;
        const source = prev.rigs.find((build) => build.id === id);
        if (!source) return prev;
        const timestamp = new Date().toISOString();
        const copyId = newRigBuildId();
        const copy: RigBuild = {
          ...source,
          id: copyId,
          name: `${source.name} Copy`,
          rig: {
            ...source.rig,
            customSpecs: source.rig.customSpecs
              ? { ...source.rig.customSpecs }
              : undefined,
            gearIds: [...source.rig.gearIds],
          },
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        return { activeRigId: copyId, rigs: [...prev.rigs, copy] };
      });
    },
    [setLibrary],
  );

  const activateRig = useCallback(
    (id: string) => {
      setLibrary((prev) =>
        prev.rigs.some((build) => build.id === id)
          ? { ...prev, activeRigId: id }
          : prev,
      );
    },
    [setLibrary],
  );

  const renameRig = useCallback(
    (id: string, name: string) => {
      const clean = name.trim().slice(0, 256);
      if (!clean) return;
      setLibrary((prev) => ({
        ...prev,
        rigs: prev.rigs.map((build) =>
          build.id === id
            ? { ...build, name: clean, updatedAt: new Date().toISOString() }
            : build,
        ),
      }));
    },
    [setLibrary],
  );

  const removeRig = useCallback(
    (id: string) => {
      setLibrary((prev) => {
        if (prev.rigs.length <= 1) return prev;
        const rigs = prev.rigs.filter((build) => build.id !== id);
        if (rigs.length === prev.rigs.length) return prev;
        return {
          activeRigId:
            prev.activeRigId === id ? rigs[rigs.length - 1].id : prev.activeRigId,
          rigs,
        };
      });
    },
    [setLibrary],
  );

  return {
    library,
    activeBuild,
    setLibrary,
    updateActiveRig,
    createRig,
    duplicateRig,
    activateRig,
    renameRig,
    removeRig,
    hydrated: ready,
  };
}

/**
 * The one rig every page agrees on. Returns the resolved `RigProfile`
 * (preset + custom spec overrides, falling back to Stock Wrangler Sport),
 * the raw stored state, and a setter.
 */
export function useActiveRig(): {
  rig: RigProfile;
  state: ActiveRigState;
  build: RigBuild;
  setState: (next: ActiveRigState | ((prev: ActiveRigState) => ActiveRigState)) => void;
  hydrated: boolean;
} {
  const { activeBuild, updateActiveRig, hydrated } = useRigLibrary();
  const state = activeBuild.rig;
  const rig = resolveRigState(state);
  return {
    rig,
    state,
    build: activeBuild,
    setState: updateActiveRig,
    hydrated,
  };
}

// ---------------------------------------------------------------------------
// Trip plan — key 'switchback:plan:v1'
// ---------------------------------------------------------------------------

export function useTripPlan(): {
  plan: TripPlan | null;
  setPlan: (next: TripPlan | null | ((prev: TripPlan | null) => TripPlan | null)) => void;
  hydrated: boolean;
  clear: () => void;
} {
  const [plan, setPlan, { hydrated, clear }] = useLocalStorage<TripPlan | null>(
    PLAN_STORAGE_KEY,
    null,
  );
  return { plan, setPlan, hydrated, clear };
}

// ---------------------------------------------------------------------------
// Saved-trip library — key 'switchback:trips:v1'
// ---------------------------------------------------------------------------

// Stable empty fallback so the snapshot identity doesn't churn (see note above).
const EMPTY_TRIPS: TripPlan[] = [];

/**
 * The multi-trip library: many saved TripPlans keyed by `id`. Upsert-by-id so
 * re-saving an edited plan updates its entry rather than duplicating it. Synced
 * to the account alongside the active rig/plan by AccountSync.
 */
export function useSavedTrips(): {
  trips: TripPlan[];
  hydrated: boolean;
  /** Insert or update a plan by id. */
  saveTrip: (plan: TripPlan) => void;
  removeTrip: (id: string) => void;
  renameTrip: (id: string, name: string) => void;
} {
  const [trips, setTrips, { hydrated }] = useLocalStorage<TripPlan[]>(
    TRIPS_STORAGE_KEY,
    EMPTY_TRIPS,
  );

  const saveTrip = useCallback(
    (plan: TripPlan) => {
      setTrips((prev) => {
        const idx = prev.findIndex((t) => t.id === plan.id);
        if (idx === -1) return [...prev, plan];
        const next = prev.slice();
        next[idx] = plan;
        return next;
      });
    },
    [setTrips],
  );

  const removeTrip = useCallback(
    (id: string) => setTrips((prev) => prev.filter((t) => t.id !== id)),
    [setTrips],
  );

  const renameTrip = useCallback(
    (id: string, name: string) =>
      setTrips((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t))),
    [setTrips],
  );

  return { trips, hydrated, saveTrip, removeTrip, renameTrip };
}
