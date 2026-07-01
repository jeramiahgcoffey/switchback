import { PlanHeader } from "@/components/plan/plan-header";
import { WizardSkeleton } from "@/components/plan/wizard-skeleton";

/** Route-level loading UI — paints the same frame the page resolves into. */
export default function PlanLoading() {
  return (
    <div>
      <PlanHeader />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <WizardSkeleton />
      </div>
    </div>
  );
}
