"use client";

/**
 * Bridges the anonymous localStorage tier to the signed-in account.
 *
 * Mounted once in the root layout, renders nothing. It owns the sync
 * timestamp (`switchback:updatedAt:v1`) and:
 *
 * - On sign-in, reconciles once: if the account has no profile yet it CLAIMS
 *   the current local rig library/plan (so anonymous work is kept); otherwise it
 *   resolves local vs server by last-write-wins on `updatedAt`.
 * - While signed in, debounce-pushes later local edits to the account.
 *
 * Loop safety: `serverSnapshotRef` tracks the rig-library/plan snapshot the server is
 * known to hold. A local change equal to it is a remote apply (skip); a change
 * that differs is a genuine user edit (bump timestamp + push). React batches
 * the reconcile's setState calls, so applied state lands as one snapshot.
 */

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSession } from "@/lib/auth-client";
import {
  SYNC_UPDATED_AT_KEY,
  TRIPS_STORAGE_KEY,
  useLocalStorage,
  useRigLibrary,
  useTripPlan,
} from "@/lib/storage";
import { getActiveRigBuild } from "@/lib/rig-library";
import type { RigLibraryState, TripPlan, UserProfile } from "@/lib/types";

const PUSH_DEBOUNCE_MS = 800;

// Stable empty fallback so the trips snapshot identity doesn't churn.
const EMPTY_TRIPS: TripPlan[] = [];

function snapshotOf(
  rigLibrary: RigLibraryState,
  plan: TripPlan | null,
  trips: TripPlan[],
): string {
  return JSON.stringify({ rigLibrary, plan, trips });
}

async function putProfile(
  rigLibrary: RigLibraryState,
  plan: TripPlan | null,
  trips: TripPlan[],
  updatedAt: string,
): Promise<UserProfile | null> {
  try {
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rigLibrary,
        activeRig: getActiveRigBuild(rigLibrary).rig,
        tripPlan: plan,
        trips,
        updatedAt,
      }),
    });
    if (!res.ok) return null;
    return ((await res.json()) as { profile?: UserProfile }).profile ?? null;
  } catch {
    // Offline / transient — a failed write leaves serverSnapshot unchanged, so
    // the next edit or sign-in reconciliation retries it.
    return null;
  }
}

export function AccountSync() {
  const { data: session } = useSession();
  const {
    library: rigLibrary,
    setLibrary: setRigLibrary,
    hydrated: rigsHydrated,
  } = useRigLibrary();
  const { plan, setPlan } = useTripPlan();
  const [trips, setTrips] = useLocalStorage<TripPlan[]>(
    TRIPS_STORAGE_KEY,
    EMPTY_TRIPS,
  );
  const [updatedAt, setUpdatedAt, { hydrated: syncHydrated }] = useLocalStorage(
    SYNC_UPDATED_AT_KEY,
    "",
  );
  const hydrated = rigsHydrated && syncHydrated;

  const userId = session?.user?.id ?? null;
  const snapshot = useMemo(
    () => snapshotOf(rigLibrary, plan, trips),
    [rigLibrary, plan, trips],
  );

  // Latest values, read inside async callbacks without widening effect deps.
  // Written in an effect (not during render) so it reflects committed state and
  // stays consistent under Strict Mode / concurrent re-renders.
  const latest = useRef({ rigLibrary, plan, trips, updatedAt, snapshot });
  useEffect(() => {
    latest.current = { rigLibrary, plan, trips, updatedAt, snapshot };
  });

  const reconciledUser = useRef<string | null>(null);
  const serverSnapshot = useRef<string | null>(null); // what the account holds
  const baseline = useRef<string | null>(null); // last snapshot we processed
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyServerProfile = useCallback(
    (profile: UserProfile) => {
      const serverTrips = profile.trips ?? [];
      const serverSnap = snapshotOf(
        profile.rigLibrary,
        profile.tripPlan,
        serverTrips,
      );
      serverSnapshot.current = serverSnap;

      const local = latest.current;
      if (serverSnap !== local.snapshot || profile.updatedAt !== local.updatedAt) {
        baseline.current = serverSnap;
        setRigLibrary(profile.rigLibrary);
        setPlan(profile.tripPlan);
        setTrips(serverTrips);
        setUpdatedAt(profile.updatedAt);
      }
    },
    [setRigLibrary, setPlan, setTrips, setUpdatedAt],
  );

  // Reset when signed out; the local tier stays usable anonymously.
  useEffect(() => {
    if (!userId) {
      reconciledUser.current = null;
      serverSnapshot.current = null;
    }
  }, [userId]);

  // Reconcile once per sign-in.
  useEffect(() => {
    if (!userId || !hydrated || reconciledUser.current === userId) return;
    reconciledUser.current = userId;
    let cancelled = false;
    let done = false;

    (async () => {
      let profile: UserProfile | null = null;
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) {
          reconciledUser.current = null; // allow a retry on the next render
          return;
        }
        profile = (await res.json()).profile ?? null;
      } catch {
        reconciledUser.current = null;
        return;
      }
      if (cancelled) return;

      const local = latest.current;
      if (!profile) {
        // Account is empty: claim the local rig/plan. Only mark synced once the
        // write is confirmed, so a failed claim retries instead of going quiet.
        const ts = local.updatedAt || new Date().toISOString();
        if (!local.updatedAt) setUpdatedAt(ts);
        const saved = await putProfile(
          local.rigLibrary,
          local.plan,
          local.trips,
          ts,
        );
        if (cancelled) return;
        if (saved) applyServerProfile(saved);
      } else {
        const serverTrips = profile.trips ?? [];
        const serverSnap = snapshotOf(
          profile.rigLibrary,
          profile.tripPlan,
          serverTrips,
        );
        const localNewer =
          local.updatedAt && profile.updatedAt && local.updatedAt > profile.updatedAt;

        if (serverSnap === local.snapshot) {
          applyServerProfile(profile); // already in sync
        } else if (localNewer) {
          const saved = await putProfile(
            local.rigLibrary,
            local.plan,
            local.trips,
            local.updatedAt,
          );
          if (cancelled) return;
          if (saved) applyServerProfile(saved); // local wins: apply canonical copy
        } else {
          // Server wins: apply it locally (batched -> one snapshot).
          applyServerProfile(profile);
        }
      }
      done = true;
    })();

    return () => {
      cancelled = true;
      // If we were torn down before finishing (Strict Mode remount, unmount
      // mid-flight), release the slot so the next mount re-runs reconciliation.
      if (!done) reconciledUser.current = null;
    };
  }, [userId, hydrated, setUpdatedAt, applyServerProfile]);

  // Track local changes: bump the timestamp on genuine user edits, and push
  // when signed in. A change equal to the server snapshot is a remote apply.
  useEffect(() => {
    if (!hydrated) return;
    if (baseline.current === null) {
      baseline.current = snapshot; // first hydrated snapshot: no edit
      return;
    }
    if (snapshot === baseline.current) return;
    baseline.current = snapshot;

    if (snapshot === serverSnapshot.current) return; // remote apply, not an edit

    const ts = new Date().toISOString();
    setUpdatedAt(ts);

    if (userId && reconciledUser.current === userId) {
      if (pushTimer.current) clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(async () => {
        const now = latest.current;
        const saved = await putProfile(
          now.rigLibrary,
          now.plan,
          now.trips,
          now.updatedAt || ts,
        );
        if (saved) applyServerProfile(saved);
      }, PUSH_DEBOUNCE_MS);
    }
  }, [snapshot, hydrated, userId, setUpdatedAt, applyServerProfile]);

  useEffect(() => {
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, []);

  return null;
}
