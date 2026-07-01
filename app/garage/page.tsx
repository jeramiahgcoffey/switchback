import type { Metadata } from "next";
import { GarageClient } from "@/components/garage/garage-client";

export const metadata: Metadata = {
  title: "Garage",
  description:
    "Rig presets, spec sheets, a trail readiness matrix, and a payload calculator.",
};

/**
 * Garage — rig presets and an instrument-panel spec sheet, a readiness
 * matrix across the whole trail catalog, and the payload calculator.
 * All user state lives client-side in localStorage ('switchback:rig:v1')
 * so the Explorer, Detail, and Plan pages reflect the same rig.
 */
export default function GaragePage() {
  return (
    <div>
      {/* page hero */}
      <section className="relative overflow-hidden border-b border-edge">
        <div aria-hidden className="absolute inset-0 bg-topo" />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-basalt via-transparent to-transparent"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="readout text-xs text-sand-dim sm:text-sm">
            SPEC SHEET · READINESS MATRIX · WEIGHT BUDGET
          </p>
          <h1 className="heading-display mt-3 text-5xl sm:text-6xl">
            Ready the rig
          </h1>
          <p className="mt-4 max-w-xl text-sm text-sand sm:text-base">
            Pick a platform, dial the specs, and let the math do the arguing:
            every trail in the catalog scored against your build, and a payload
            budget that knows what a rooftop tent actually weighs.
          </p>
        </div>
      </section>

      <GarageClient />
    </div>
  );
}
