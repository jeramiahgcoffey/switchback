import type { Metadata } from "next";
import { Suspense } from "react";
import { TrailExplorer } from "@/components/explorer/trail-explorer";
import { ExplorerHeader, ExplorerSkeleton } from "@/components/explorer/explorer-skeleton";

export const metadata: Metadata = {
  title: "Trail Explorer",
  description:
    "Filter twelve curated overland routes by difficulty, terrain, season, trip length, and state — every trailhead plotted on a live overview map.",
};

/**
 * Trail Explorer. The page itself stays static; filters are read on the
 * client from URL searchParams, so the interactive tree sits behind a
 * Suspense boundary (required for useSearchParams on a prerendered route).
 */
export default function TrailsPage() {
  return (
    <div>
      <ExplorerHeader />
      <Suspense fallback={<ExplorerSkeleton />}>
        <TrailExplorer />
      </Suspense>
    </div>
  );
}
