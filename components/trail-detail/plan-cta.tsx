import { Button } from "@/components/ui/button";
import type { Trail } from "@/lib/types";

/**
 * Sticky "Plan this trip" bar — pinned to the viewport bottom while the
 * detail page scrolls (it must be the last child of the page's root
 * element), deep-linking into the Trip Builder with ?trail=slug.
 */
export function PlanCta({ trail }: { trail: Trail }) {
  return (
    <div className="sticky bottom-0 z-40 border-t border-edge bg-basalt/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="heading-display truncate text-lg leading-tight">{trail.name}</p>
          <p className="readout text-[11px] text-sand-dim">
            {trail.distanceMiles.toLocaleString("en-US")} MI · {trail.estimatedDays}D ·
            DIFF {trail.difficulty}/5
          </p>
        </div>
        <Button href={`/plan?trail=${trail.slug}`} className="shrink-0">
          Plan this trip
        </Button>
      </div>
    </div>
  );
}
