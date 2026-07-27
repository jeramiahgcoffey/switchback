"use client";

/**
 * Trip Builder workspace: the saved-trip library stacked above the wizard.
 *
 * Owns the coordination the wizard can't do alone:
 * - "Save this trip" snapshots the working plan into the library (upsert by id,
 *   so re-saving an edited plan updates its entry rather than duplicating).
 * - "Load" makes a saved trip the working plan and remounts the wizard (via a
 *   changing `key`) so it re-seeds from that plan. Any `?trail=` seed is cleared
 *   first so it can't override the loaded trip.
 *
 * The library and wizard share `switchback:plan:v1` / `switchback:trips:v1`, so
 * saves show up live and everything syncs to the account through AccountSync.
 */

import { useCallback, useState } from "react";
import { useLocalStorage, useSavedTrips, useTripPlan } from "@/lib/storage";
import type { TripPlan } from "@/lib/types";
import { SavedTripsBar } from "./saved-trips-bar";
import { TripWizard } from "./trip-wizard";
import { PLAN_STEP_STORAGE_KEY, type WizardStep } from "./wizard-shared";

export function PlanWorkspace() {
  const { plan, setPlan } = useTripPlan();
  const { trips, hydrated, saveTrip, removeTrip, renameTrip } = useSavedTrips();
  const [, setStoredStep] = useLocalStorage<WizardStep>(PLAN_STEP_STORAGE_KEY, 1);
  const [wizardKey, setWizardKey] = useState(0);

  const handleLoad = useCallback(
    (trip: TripPlan) => {
      // Drop a stale `?trail=` seed (Next syncs useSearchParams to this) so the
      // remounted wizard seeds from the loaded plan, not the URL.
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (url.searchParams.has("trail")) {
          url.searchParams.delete("trail");
          window.history.replaceState(null, "", url.pathname + url.search);
        }
      }
      setPlan(trip);
      setStoredStep(1);
      setWizardKey((k) => k + 1);
      window.scrollTo(0, 0);
    },
    [setPlan, setStoredStep],
  );

  const handleSaveCurrent = useCallback(() => {
    if (plan) saveTrip(plan);
  }, [plan, saveTrip]);

  const activePlanId = plan?.id ?? null;
  const canSaveCurrent = !!plan;
  const currentIsSaved = !!plan && trips.some((t) => t.id === plan.id);
  const showBar = hydrated && (trips.length > 0 || canSaveCurrent);

  return (
    <div className="space-y-8">
      {showBar && (
        <SavedTripsBar
          trips={trips}
          activePlanId={activePlanId}
          canSaveCurrent={canSaveCurrent}
          currentIsSaved={currentIsSaved}
          onSaveCurrent={handleSaveCurrent}
          onLoad={handleLoad}
          onDelete={removeTrip}
          onRename={renameTrip}
        />
      )}
      <TripWizard key={wizardKey} />
    </div>
  );
}
