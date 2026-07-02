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
  useActiveRig,
  useLocalStorage,
  useTripPlan,
} from "@/lib/storage";
import type { ActiveRigState, TripPlan, UserProfile } from "@/lib/types";

const PUSH_DEBOUNCE_MS = 800;

function snapshotOf(rig: ActiveRigState, plan: TripPlan | null): string {
  return JSON.stringify({ rig, plan });
}

async function putProfile(rig: ActiveRigState, plan: TripPlan | null, updatedAt: string) {
  try {
    await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activeRig: rig, tripPlan: plan, updatedAt }),
    });
  } catch {
    // Offline / transient — localStorage still holds the change; next edit or
    // sign-in reconciles it.
  }
}

export function AccountSync() {
  const { data: session } = useSession();
  const { state: rig, setState: setRig } = useActiveRig();
  const { plan, setPlan } = useTripPlan();
  const [updatedAt, setUpdatedAt, { hydrated }] = useLocalStorage(
    SYNC_UPDATED_AT_KEY,
    "",
  );

  const userId = session?.user?.id ?? null;
  const snapshot = useMemo(() => snapshotOf(rig, plan), [rig, plan]);

  // Latest values, read inside async callbacks without widening effect deps.
  const latest = useRef({ rig, plan, updatedAt, snapshot });
  latest.current = { rig, plan, updatedAt, snapshot };

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
        // Account is empty: claim the local rig/plan.
        const ts = local.updatedAt || new Date().toISOString();
        serverSnapshot.current = local.snapshot;
        if (!local.updatedAt) setUpdatedAt(ts);
        await putProfile(local.rig, local.plan, ts);
        return;
      }

      const serverSnap = snapshotOf(profile.activeRig, profile.tripPlan);
      const localNewer =
        local.updatedAt && profile.updatedAt && local.updatedAt > profile.updatedAt;

      if (serverSnap === local.snapshot) {
        serverSnapshot.current = serverSnap; // already in sync
      } else if (localNewer) {
        serverSnapshot.current = local.snapshot; // local wins: push
        await putProfile(local.rig, local.plan, local.updatedAt);
      } else {
        // Server wins: apply it locally (batched -> one snapshot).
        serverSnapshot.current = serverSnap;
        baseline.current = serverSnap;
        setRig(profile.activeRig);
        setPlan(profile.tripPlan);
        setUpdatedAt(profile.updatedAt);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, hydrated, setRig, setPlan, setUpdatedAt]);

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
      pushTimer.current = setTimeout(() => {
        const now = latest.current;
        serverSnapshot.current = now.snapshot;
        void putProfile(now.rig, now.plan, now.updatedAt || ts);
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
