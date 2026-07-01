"use client";

import type { RigProfile } from "@/lib/types";
import { DEFAULT_RIG_ID, getRigById, rigs } from "@/lib/data/rigs";
import { useActiveRig, type ActiveRigState } from "@/lib/storage";
import { RigSelector } from "@/components/garage/rig-selector";
import {
  SpecPanel,
  type BooleanSpecKey,
  type NumericSpecKey,
} from "@/components/garage/spec-panel";
import { ReadinessMatrix } from "@/components/garage/readiness-matrix";
import { LoadoutBuilder } from "@/components/garage/loadout-builder";

type CustomSpecs = NonNullable<ActiveRigState["customSpecs"]>;

function SectionHeader({
  step,
  title,
  blurb,
  aside,
}: {
  step: string;
  title: string;
  blurb: string;
  aside?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="stat-label">
          <span className="readout mr-2 !text-ember">{step}</span>
          {title}
        </p>
        <p className="mt-2 max-w-xl text-sm text-sand-dim">{blurb}</p>
      </div>
      {aside ? <p className="readout text-[11px] text-sand-dim">{aside}</p> : null}
    </div>
  );
}

/**
 * Garage client root: owns the shared active-rig state
 * ('switchback:rig:v1') that the Explorer, Detail, and Plan pages read.
 */
export function GarageClient() {
  const { rig, state, setState } = useActiveRig();
  const preset =
    getRigById(state.rigId) ?? getRigById(DEFAULT_RIG_ID) ?? rigs[0];
  const modified = Object.keys(state.customSpecs ?? {}).length > 0;
  const gearIds = state.gearIds ?? [];

  const selectRig = (next: RigProfile) => {
    // Switching platforms resets spec edits; the loadout carries over.
    setState((prev) => ({ ...prev, rigId: next.id, customSpecs: undefined }));
  };

  const setNumericSpec = (key: NumericSpecKey, value: number) => {
    setState((prev) => {
      const base = getRigById(prev.rigId) ?? preset;
      const specs: CustomSpecs = { ...prev.customSpecs };
      if (base[key] === value) delete specs[key];
      else specs[key] = value;
      return {
        ...prev,
        customSpecs: Object.keys(specs).length > 0 ? specs : undefined,
      };
    });
  };

  const setBooleanSpec = (key: BooleanSpecKey, value: boolean) => {
    setState((prev) => {
      const base = getRigById(prev.rigId) ?? preset;
      const specs: CustomSpecs = { ...prev.customSpecs };
      if (base[key] === value) delete specs[key];
      else specs[key] = value;
      return {
        ...prev,
        customSpecs: Object.keys(specs).length > 0 ? specs : undefined,
      };
    });
  };

  const resetSpecs = () =>
    setState((prev) => ({ ...prev, customSpecs: undefined }));

  const setGearIds = (next: string[]) =>
    setState((prev) => ({ ...prev, gearIds: next }));

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      {/* 01: rig presets */}
      <section aria-label="Rig presets" className="py-12 sm:py-16">
        <SectionHeader
          step="01"
          title="Pick your platform"
          blurb="Three ready-made builds, or a starting point for your own. The active rig follows you to the Explorer, trail pages, and trip builder."
        />
        <div className="mt-6">
          <RigSelector
            activeRigId={state.rigId}
            modified={modified}
            onSelect={selectRig}
          />
        </div>
      </section>

      {/* 02: spec sheet */}
      <section aria-label="Spec sheet" className="pb-12 sm:pb-16">
        <SectionHeader
          step="02"
          title="Dial the specs"
          blurb="Tires, clearance, range, payload, and equipment. Every change re-scores the readiness matrix and the weight budget below, live."
        />
        <div className="mt-6">
          <SpecPanel
            rig={rig}
            preset={preset}
            modified={modified}
            onNumericSpec={setNumericSpec}
            onBooleanSpec={setBooleanSpec}
            onReset={resetSpecs}
          />
        </div>
      </section>

      <hr className="divider-route" />

      {/* 03: readiness matrix */}
      <section aria-label="Trail readiness matrix" className="py-12 sm:py-16">
        <SectionHeader
          step="03"
          title="Trail readiness"
          blurb="Every route in the catalog scored against this rig: tires, clearance, low range, traction, recovery, and fuel. Expand a row for the itemized verdict."
          aside={`SCORED AGAINST: ${rig.name.toUpperCase()}${modified ? " · MOD" : ""}`}
        />
        <div className="mt-6">
          <ReadinessMatrix rig={rig} />
        </div>
      </section>

      <hr className="divider-route" />

      {/* 04: payload calculator */}
      <section aria-label="Loadout and payload calculator" className="py-12 sm:py-16">
        <SectionHeader
          step="04"
          title="Build the loadout"
          blurb="Toggle gear onto the truck and watch it consume payload. Water weighs 8.3 lb a gallon whether you believe in it or not."
          aside={`PAYLOAD: ${rig.payloadLbs.toLocaleString("en-US")} LB`}
        />
        <div className="mt-6">
          <LoadoutBuilder rig={rig} gearIds={gearIds} onGearIds={setGearIds} />
        </div>
      </section>
    </div>
  );
}
