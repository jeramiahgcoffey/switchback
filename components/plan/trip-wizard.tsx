"use client";

/**
 * Trip Wizard orchestrator. Owns the PlanDraft, routes between the three
 * steps, and writes through to the shared plan storage:
 *
 * - the plan itself      -> 'switchback:plan:v1'  (useTripPlan)
 * - the wizard position  -> 'switchback:plan:step:v1'
 *
 * The inner wizard mounts client-only (gated on useHydrated) so its
 * initial state can be seeded synchronously from localStorage and the
 * `?trail=` search param without any hydration mismatch; until then the
 * WizardSkeleton paints the frame.
 */

import { useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { buildFuelCheck, splitIntoDays } from "@/lib/derive";
import { getTrailBySlug } from "@/lib/data/trails";
import { DEFAULT_RIG_ID, getRigById, rigs } from "@/lib/data/rigs";
import {
  useActiveRig,
  useHydrated,
  useLocalStorage,
  useTripPlan,
} from "@/lib/storage";
import type { RigProfile, TripPlan } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { SaveTickIcon } from "./plan-icons";
import { StepIndicator } from "./step-indicator";
import { StepSetup } from "./step-setup";
import { StepItinerary } from "./step-itinerary";
import { StepChecklist } from "./step-checklist";
import { WizardSkeleton } from "./wizard-skeleton";
import {
  PLAN_STEP_STORAGE_KEY,
  clampTargetDays,
  maxSplitDays,
  newPlanId,
  nextFridayISO,
  seasonForDate,
  type PlanDraft,
  type WizardStep,
} from "./wizard-shared";
import styles from "./plan.module.css";

function draftFromPlan(plan: TripPlan): PlanDraft {
  return {
    id: plan.id,
    createdAt: plan.createdAt,
    trailSlug: plan.trailSlug,
    startDate: plan.startDate,
    partySize: plan.partySize,
    rigId: plan.rigId,
    targetDays: Math.max(1, plan.days.length),
    checklist: plan.checklist,
  };
}

function newDraft(trailSlug: string | null, rigId: string): PlanDraft {
  const trail = trailSlug ? getTrailBySlug(trailSlug) : undefined;
  return {
    id: newPlanId(),
    createdAt: new Date().toISOString(),
    trailSlug: trail ? trail.slug : null,
    startDate: nextFridayISO(),
    partySize: 2,
    rigId,
    targetDays: trail ? clampTargetDays(trail, trail.estimatedDays) : 2,
    checklist: {},
  };
}

function asStep(value: unknown): WizardStep {
  return value === 2 || value === 3 ? value : 1;
}

/** Public entry — renders the skeleton until localStorage is readable. */
export function TripWizard() {
  const hydrated = useHydrated();
  if (!hydrated) return <WizardSkeleton />;
  return <TripWizardInner />;
}

function TripWizardInner() {
  const searchParams = useSearchParams();
  const trailParam = searchParams.get("trail");
  const { plan, setPlan, clear: clearPlan } = useTripPlan();
  const { state: garageState } = useActiveRig();
  const [storedStep, setStoredStep, { clear: clearStep }] =
    useLocalStorage<WizardStep>(PLAN_STEP_STORAGE_KEY, 1);

  // Seed once on mount: resume the saved plan (and its stored step) unless
  // ?trail= points at a different route, in which case start a fresh draft
  // for that trail back on step one.
  const [initial] = useState(() => {
    const paramTrail = trailParam ? getTrailBySlug(trailParam) : undefined;
    if (plan && (!paramTrail || paramTrail.slug === plan.trailSlug)) {
      return { draft: draftFromPlan(plan), step: asStep(storedStep) };
    }
    return {
      draft: newDraft(paramTrail?.slug ?? null, garageState.rigId),
      step: 1 as WizardStep,
    };
  });
  const [draft, setDraft] = useState<PlanDraft>(initial.draft);
  const [step, setStep] = useState<WizardStep>(initial.step);
  const [maxVisited, setMaxVisited] = useState<WizardStep>(initial.step);

  /** Write the draft through as a TripPlan once it has a trail. */
  const persist = useCallback(
    (next: PlanDraft) => {
      const trail = next.trailSlug ? getTrailBySlug(next.trailSlug) : undefined;
      if (trail) {
        setPlan({
          id: next.id,
          trailSlug: trail.slug,
          startDate: next.startDate,
          partySize: next.partySize,
          rigId: next.rigId,
          days: splitIntoDays(trail, clampTargetDays(trail, next.targetDays)),
          checklist: next.checklist,
          createdAt: next.createdAt,
        });
      }
    },
    [setPlan],
  );

  /** Update the draft and persist it. */
  const commit = useCallback(
    (next: PlanDraft) => {
      setDraft(next);
      persist(next);
    },
    [persist],
  );

  /** Navigate between steps; navigating also persists a ?trail=-seeded draft. */
  const goTo = useCallback(
    (next: WizardStep) => {
      persist(draft);
      setStep(next);
      setMaxVisited((m) => (next > m ? next : m));
      setStoredStep(next);
      window.scrollTo(0, 0);
    },
    [draft, persist, setStoredStep],
  );

  const startOver = useCallback(() => {
    clearPlan();
    clearStep();
    setDraft(newDraft(null, garageState.rigId));
    setStep(1);
    setMaxVisited(1);
    window.scrollTo(0, 0);
  }, [clearPlan, clearStep, garageState.rigId]);

  /** Garage spec edits only apply to the build they were made on. */
  const resolveRig = useCallback(
    (id: string): RigProfile => {
      const preset = getRigById(id) ?? getRigById(DEFAULT_RIG_ID) ?? rigs[0];
      return id === garageState.rigId
        ? { ...preset, ...garageState.customSpecs }
        : preset;
    },
    [garageState],
  );

  // Derived trip model.
  const trail = draft.trailSlug ? getTrailBySlug(draft.trailSlug) : undefined;
  const season = seasonForDate(draft.startDate);
  const rig = resolveRig(draft.rigId);
  const targetDays = trail
    ? clampTargetDays(trail, draft.targetDays)
    : draft.targetDays;
  const days = trail ? splitIntoDays(trail, targetDays) : [];
  const fuel = trail ? buildFuelCheck(days, trail, rig) : null;

  // Steps 2-3 are meaningless without a trail; clamp defensively.
  const effectiveStep: WizardStep = trail ? step : 1;
  const maxReachable: WizardStep = trail ? maxVisited : 1;

  return (
    <div>
      <div className="mx-auto max-w-xl">
        <StepIndicator
          current={effectiveStep}
          maxReachable={maxReachable}
          onSelect={goTo}
        />
      </div>

      <div key={effectiveStep} className={`mt-10 ${styles.stepEnter}`}>
        {effectiveStep === 1 && (
          <StepSetup
            trailSlug={draft.trailSlug}
            startDate={draft.startDate}
            partySize={draft.partySize}
            rigId={draft.rigId}
            season={season}
            selectedTrail={trail}
            garageRigId={garageState.rigId}
            resolveRig={resolveRig}
            onSelectTrail={(slug) => {
              if (slug === draft.trailSlug) return;
              const next = getTrailBySlug(slug);
              commit({
                ...draft,
                trailSlug: slug,
                targetDays: next
                  ? clampTargetDays(next, next.estimatedDays)
                  : draft.targetDays,
                checklist: {},
              });
            }}
            onStartDate={(iso) => commit({ ...draft, startDate: iso })}
            onPartySize={(n) => commit({ ...draft, partySize: n })}
            onRigId={(id) => commit({ ...draft, rigId: id })}
          />
        )}

        {effectiveStep === 2 && trail && fuel && (
          <StepItinerary
            trail={trail}
            rig={rig}
            days={days}
            fuel={fuel}
            startDate={draft.startDate}
            targetDays={targetDays}
            maxDays={maxSplitDays(trail)}
            onTargetDays={(n) =>
              commit({ ...draft, targetDays: clampTargetDays(trail, n) })
            }
          />
        )}

        {effectiveStep === 3 && trail && (
          <StepChecklist
            trail={trail}
            dayCount={days.length}
            season={season}
            partySize={draft.partySize}
            checklist={draft.checklist}
            onToggle={(id) =>
              commit({
                ...draft,
                checklist: { ...draft.checklist, [id]: !draft.checklist[id] },
              })
            }
            onClear={() => commit({ ...draft, checklist: {} })}
          />
        )}
      </div>

      {/* Wizard footer — back/continue plus the auto-save readout. */}
      <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-edge pt-6">
        {effectiveStep > 1 && (
          <Button variant="outline" onClick={() => goTo((effectiveStep - 1) as WizardStep)}>
            Back
          </Button>
        )}
        {effectiveStep === 3 && (
          <Button variant="ghost" onClick={startOver}>
            Start over
          </Button>
        )}
        <span className="flex-1" />
        {plan?.id === draft.id && (
          <span className="flex items-center gap-1.5 text-xs text-sand-dim">
            <SaveTickIcon size={14} className="text-sage-bright" />
            Saved to this device
          </span>
        )}
        {effectiveStep < 3 ? (
          <Button
            onClick={() => goTo((effectiveStep + 1) as WizardStep)}
            disabled={!trail}
            title={trail ? undefined : "Choose a trail to continue"}
            className="disabled:cursor-not-allowed disabled:opacity-40"
          >
            {effectiveStep === 1 ? "Build itinerary" : "Build pack list"}
          </Button>
        ) : (
          trail && (
            <Button href={`/trails/${trail.slug}`} variant="outline">
              Review trail guide
            </Button>
          )
        )}
      </div>
    </div>
  );
}
