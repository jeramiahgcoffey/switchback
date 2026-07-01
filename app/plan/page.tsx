import type { Metadata } from "next";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Trip Builder",
  description:
    "Turn a trail into a concrete plan: itinerary, wheel hours, fuel checks, and a condition-aware packing list.",
};

/**
 * FOUNDATION STUB — the three-step Trip Wizard (trail + date + rig,
 * auto-split itinerary, condition-aware packing checklist, localStorage
 * persistence, ?trail= pre-seeding) is owned by the `trip-builder` feature.
 */
export default function PlanPage() {
  return (
    <div className="relative overflow-hidden">
      <div aria-hidden className="absolute inset-0 bg-topo" />
      <div className="relative mx-auto max-w-4xl px-4 py-24 text-center sm:px-6">
        <p className="stat-label">Trip Builder</p>
        <h1 className="heading-display mt-2 text-5xl">Build your plan</h1>
        <p className="mx-auto mt-4 max-w-md text-sm text-sand-dim">
          The three-step wizard — trail, itinerary, packing list — is being
          bolted on. Pick a trail to get a head start.
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
