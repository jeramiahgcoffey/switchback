import type { Metadata } from "next";
import { Suspense } from "react";
import { PlanHeader } from "@/components/plan/plan-header";
import { TripWizard } from "@/components/plan/trip-wizard";
import { WizardSkeleton } from "@/components/plan/wizard-skeleton";

export const metadata: Metadata = {
  title: "Trip Builder",
  description:
    "Turn a trail into a concrete plan: itinerary, wheel hours, fuel checks, and a condition-aware packing list.",
};

/**
 * Trip Builder. The page itself stays static; the wizard reads `?trail=`
 * pre-seeding from URL searchParams on the client, so the interactive tree
 * sits behind a Suspense boundary (required for useSearchParams on a
 * prerendered route).
 */
export default function PlanPage() {
  return (
    <div>
      <PlanHeader />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <Suspense fallback={<WizardSkeleton />}>
          <TripWizard />
        </Suspense>
      </div>
    </div>
  );
}
