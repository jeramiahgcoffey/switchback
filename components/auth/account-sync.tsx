"use client";

/**
 * Bridges the anonymous localStorage tier to the signed-in account.
 *
 * Mounted once in the root layout, renders nothing. It owns the sync
 * timestamp (`switchback:updatedAt:v1`) and:
 *
 * - On sign-in, reconciles once: if the account has no profile yet it CLAIMS
 *   the current local rig/plan (so anonymous work is kept); otherwise it
 *   resolves local vs server by last-write-wins on `updatedAt`.
 * - While signed in, debounce-pushes later local edits to the account.
 *
 * Loop safety: `serverSnapshotRef` tracks the rig/plan snapshot the server is
 * known to hold. A local change equal to it is a remote apply (skip); a change
 * that differs is a genuine user edit (bump timestamp + push). React batches
 * the reconcile's setState calls, so applied state lands as one snapshot.
 */

import { useEffect, useMemo, useRef } from "react";
import { useSession } from "@/lib/auth-client";
import {
  SYNC_UPDATED_AT_KEY,
  TRIPS_STORAGE_KEY,
  useActiveRig,
  useLocalStorage,
  useTripPlan,
} from "@/lib/storage";
import type { ActiveRigState, TripPlan, UserProfile } from "@/lib/types";

const PUSH_DEBOUNCE_MS = 800;

// Stable empty fallback so the trips snapshot identity doesn't churn.
const EMPTY_TRIPS: TripPlan[] = [];

function snapshotOf(
  rig: ActiveRigState,
  plan: TripPlan | null,
  trips: TripPlan[],
): string {
  return JSON.stringify({ rig, plan, trips });
}

async function putProfile(
  rig: ActiveRigState,
  plan: TripPlan | null,
  trips: TripPlan[],
  updatedAt: string,
): Promise<boolean> {
  try {
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activeRig: rig, tripPlan: plan, trips, updatedAt }),
    });
    return res.ok;
  } catch {
    // Offline / transient — a failed write leaves serverSnapshot unchanged, so
    // the next edit or sign-in reconciliation retries it.
    return false;
  }
}

export function AccountSync() {
  const { data: session } = useSession();
  const { state: rig, setState: setRig } = useActiveRig();
  const { plan, setPlan } = useTripPlan();
  const [trips, setTrips] = useLocalStorage<TripPlan[]>(
    TRIPS_STORAGE_KEY,
    EMPTY_TRIPS,
  );
  const [updatedAt, setUpdatedAt, { hydrated }] = useLocalStorage(
    SYNC_UPDATED_AT_KEY,
    "",
  );

  const userId = session?.user?.id ?? null;
  const snapshot = useMemo(
    () => snapshotOf(rig, plan, trips),
    [rig, plan, trips],
  );

  // Latest values, read inside async callbacks without widening effect deps.
  // Written in an effect (not during render) so it reflects committed state and
  // stays consistent under Strict Mode / concurrent re-renders.
  const latest = useRef({ rig, plan, trips, updatedAt, snapshot });
  useEffect(() => {
    latest.current = { rig, plan, trips, updatedAt, snapshot };
  });

  const reconciledUser = useRef<string | null>(null);
  const serverSnapshot = useRef<string | null>(null); // what the account holds
  const baseline = useRef<string | null>(null); // last snapshot we processed
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        if (await putProfile(local.rig, local.plan, local.trips, ts)) {
          serverSnapshot.current = local.snapshot;
        }
      } else {
        const serverTrips = profile.trips ?? [];
        const serverSnap = snapshotOf(
          profile.activeRig,
          profile.tripPlan,
          serverTrips,
        );
        const localNewer =
          local.updatedAt && profile.updatedAt && local.updatedAt > profile.updatedAt;

        if (serverSnap === local.snapshot) {
          serverSnapshot.current = serverSnap; // already in sync
        } else if (localNewer) {
          if (
            await putProfile(local.rig, local.plan, local.trips, local.updatedAt)
          ) {
            serverSnapshot.current = local.snapshot; // local wins: pushed
          }
        } else {
          // Server wins: apply it locally (batched -> one snapshot).
          serverSnapshot.current = serverSnap;
          baseline.current = serverSnap;
          setRig(profile.activeRig);
          setPlan(profile.tripPlan);
          setTrips(serverTrips);
          setUpdatedAt(profile.updatedAt);
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
  }, [userId, hydrated, setRig, setPlan, setTrips, setUpdatedAt]);

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
        if (await putProfile(now.rig, now.plan, now.trips, now.updatedAt || ts)) {
          serverSnapshot.current = now.snapshot; // only mark synced on success
        }
      }, PUSH_DEBOUNCE_MS);
    }
  }, [snapshot, hydrated, userId, setUpdatedAt]);

  useEffect(() => {
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, []);

  return null;
}
