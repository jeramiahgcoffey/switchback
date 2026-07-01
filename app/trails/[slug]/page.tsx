import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DifficultyChip } from "@/components/ui/difficulty";
import { getTrailBySlug, trails } from "@/lib/data/trails";
import { formatCoords, formatFeet, formatMiles } from "@/lib/derive";

export function generateStaticParams() {
  return trails.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const trail = getTrailBySlug(slug);
  if (!trail) return { title: "Trail not found" };
  return { title: trail.name, description: trail.summary };
}

/**
 * FOUNDATION STUB — the full Trail Detail (route polyline map, typed
 * waypoint markers, hover-synced SVG elevation profile, requirements panel)
 * is owned by the `trail-detail` feature. This stub keeps every trail route
 * statically generated and navigable.
 */
export default async function TrailDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const trail = getTrailBySlug(slug);
  if (!trail) notFound();

  const trailhead = trail.waypoints.find((w) => w.kind === "trailhead");

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <Link
        href="/trails"
        className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-sand-dim transition-colors hover:text-bone"
      >
        ← All trails
      </Link>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <DifficultyChip level={trail.difficulty} />
        <Badge tone="sand">
          {trail.region}, {trail.state}
        </Badge>
      </div>
      <h1 className="heading-display mt-4 text-5xl sm:text-6xl">{trail.name}</h1>
      {trailhead ? (
        <p className="readout mt-2 text-sm text-sand-dim">
          {formatCoords(trailhead.lat, trailhead.lng)}
        </p>
      ) : null}
      <p className="mt-6 max-w-2xl text-base text-sand">{trail.summary}</p>

      <dl className="card-surface mt-10 grid grid-cols-2 gap-px sm:grid-cols-4">
        {[
          { label: "Distance", value: formatMiles(trail.distanceMiles) },
          { label: "Days", value: String(trail.estimatedDays) },
          { label: "Elevation gain", value: formatFeet(trail.elevationGainFt) },
          { label: "Max elevation", value: formatFeet(trail.maxElevationFt) },
        ].map((s) => (
          <div key={s.label} className="p-5">
            <dt className="stat-label">{s.label}</dt>
            <dd className="readout mt-1 text-xl">{s.value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-10 text-sm text-sand-dim">
        Interactive map, elevation profile, and the rig requirements panel are
        on the way.
      </p>
      <div className="mt-6">
        <Button href={`/plan?trail=${trail.slug}`}>Plan this trip</Button>
      </div>
    </div>
  );
}
