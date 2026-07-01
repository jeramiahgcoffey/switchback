import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/card";
import { DifficultyDiamonds } from "@/components/ui/difficulty";
import { trails } from "@/lib/data/trails";
import { formatCoords } from "@/lib/derive";

export const metadata: Metadata = {
  title: "Trail Explorer",
  description:
    "Filter twelve curated overland routes by difficulty, terrain, season, and state.",
};

/**
 * FOUNDATION STUB — the full Trail Explorer (filter rail, URL-synced
 * searchParams, react-leaflet overview map, hover-synced markers) is owned
 * by the `trail-explorer` feature. This stub keeps the route navigable.
 */
export default function TrailsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <p className="stat-label">Trail Explorer</p>
      <h1 className="heading-display mt-2 text-5xl">Pick a trail</h1>
      <p className="mt-4 max-w-xl text-sm text-sand-dim">
        Filters and the overview map are on the way. Meanwhile, the full
        catalog is below.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {trails.map((trail) => {
          const trailhead = trail.waypoints.find((w) => w.kind === "trailhead");
          return (
            <Link key={trail.slug} href={`/trails/${trail.slug}`} className="group block">
              <Card lift className="h-full">
                <CardBody>
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="heading-display text-xl transition-colors duration-150 group-hover:text-ember-bright">
                      {trail.name}
                    </h2>
                    <DifficultyDiamonds level={trail.difficulty} className="mt-1.5 shrink-0" />
                  </div>
                  {trailhead ? (
                    <p className="readout mt-1 text-xs text-sand-dim">
                      {formatCoords(trailhead.lat, trailhead.lng)}
                    </p>
                  ) : null}
                  <p className="mt-3 text-xs text-sand-dim">
                    {trail.region}, {trail.state}
                  </p>
                  <p className="readout mt-2 text-xs">
                    {trail.distanceMiles} mi · {trail.estimatedDays}d
                  </p>
                </CardBody>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
