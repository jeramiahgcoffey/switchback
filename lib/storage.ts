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

import { useCallback, useRef, useSyncExternalStore } from "react";
import type { ActiveRigState, RigProfile, TripPlan } from "@/lib/types";
import { DEFAULT_RIG_ID, getRigById, rigs } from "@/lib/data/rigs";

// Re-exported so existing consumers can keep importing it from here.
export type { ActiveRigState } from "@/lib/types";

export const RIG_STORAGE_KEY = "switchback:rig:v1";
export const PLAN_STORAGE_KEY = "switchback:plan:v1";
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
// Active rig — key 'switchback:rig:v1'
// ---------------------------------------------------------------------------

export const DEFAULT_ACTIVE_RIG_STATE: ActiveRigState = {
  rigId: DEFAULT_RIG_ID,
  gearIds: [],
};

/**
 * The one rig every page agrees on. Returns the resolved `RigProfile`
 * (preset + custom spec overrides, falling back to Stock Wrangler Sport),
 * the raw stored state, and a setter.
 */
export function useActiveRig(): {
  rig: RigProfile;
  state: ActiveRigState;
  setState: (next: ActiveRigState | ((prev: ActiveRigState) => ActiveRigState)) => void;
  hydrated: boolean;
} {
  const [state, setState, { hydrated }] = useLocalStorage<ActiveRigState>(
    RIG_STORAGE_KEY,
    DEFAULT_ACTIVE_RIG_STATE,
  );
  const preset = getRigById(state.rigId) ?? getRigById(DEFAULT_RIG_ID) ?? rigs[0];
  const rig: RigProfile = { ...preset, ...state.customSpecs };
  return { rig, state, setState, hydrated };
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
