import type { Metadata } from "next";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Garage",
  description:
    "Rig presets, spec sheets, a trail readiness matrix, and a payload calculator.",
};

/**
 * FOUNDATION STUB — the Garage (rig presets, instrument-panel spec sheet,
 * readiness matrix, payload calculator, localStorage persistence) is owned
 * by the `garage-readiness` feature.
 */
export default function GaragePage() {
  return (
    <div className="relative overflow-hidden">
      <div aria-hidden className="absolute inset-0 bg-topo" />
      <div className="relative mx-auto max-w-4xl px-4 py-24 text-center sm:px-6">
        <p className="stat-label">Garage</p>
        <h1 className="heading-display mt-2 text-5xl">Ready the rig</h1>
        <p className="mx-auto mt-4 max-w-md text-sm text-sand-dim">
          Spec sheets, the readiness matrix, and the payload calculator are on
          the lift. Trails are open in the meantime.
        </p>
        <div className="mt-8 flex justify-center">
          <Button href="/trails" variant="outline">
            Browse trails
          </Button>
        </div>
      </div>
    </div>
  );
}
