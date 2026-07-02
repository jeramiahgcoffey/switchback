import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { DifficultyChip } from "@/components/ui/difficulty";
import { getTrailBySlug, trails } from "@/lib/data/trails";
import { formatCoords } from "@/lib/derive";
import { TrailDetailView } from "@/components/trail-detail/trail-detail-view";
import { RequirementsPanel } from "@/components/trail-detail/requirements-panel";
import { TrailCallouts } from "@/components/trail-detail/trail-callouts";
import { TrailStatBand } from "@/components/trail-detail/stat-band";
import { PlanCta } from "@/components/trail-detail/plan-cta";

/** Every trail page is statically generated at build time. */
export const dynamicParams = false;

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
  return {
    title: trail.name,
    description: trail.summary,
    openGraph: {
      title: `${trail.name} · Switchback`,
      description: trail.summary,
      images: [{ url: trail.heroImage }],
    },
  };
}

export default async function TrailDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const trail = getTrailBySlug(slug);
  if (!trail) notFound();

  const trailhead = trail.waypoints.find((w) => w.kind === "trailhead");

  const stats = [
    { label: "Distance", value: trail.distanceMiles, unit: "mi" },
    { label: "Est. days", value: trail.estimatedDays, unit: "d" },
    { label: "Elevation gain", value: trail.elevationGainFt, unit: "ft" },
    { label: "Max elevation", value: trail.maxElevationFt, unit: "ft" },
  ];

  return (
    <div>
      {/* ------------------------------------------------ hero */}
      <section className="relative overflow-hidden border-b border-edge">
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${trail.heroImage})` }}
        />
        <div aria-hidden className="absolute inset-0 bg-topo" />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-basalt via-basalt/70 to-basalt/30"
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-14">
          <Link
            href="/trails"
            className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-sand-dim transition-colors duration-150 hover:text-bone"
          >
            ← All trails
          </Link>
          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <DifficultyChip level={trail.difficulty} />
            <Badge tone="sand">
              {trail.region}, {trail.state}
            </Badge>
            {trail.terrain.map((t) => (
              <Badge key={t} tone="neutral">
                {t.replace("-", " ")}
              </Badge>
            ))}
          </div>
          <h1 className="heading-display mt-4 max-w-4xl text-5xl leading-[0.95] sm:text-7xl">
            {trail.name}
          </h1>
          {trailhead ? (
            <p className="readout mt-3 text-sm text-sand-dim">
              {formatCoords(trailhead.lat, trailhead.lng)} · TRAILHEAD
            </p>
          ) : null}
          <p className="mt-5 max-w-2xl text-base text-sand sm:text-lg">
            {trail.summary}
          </p>
        </div>
      </section>

      {/* ------------------------------------------------ stat band */}
      <section
        aria-label="Trail stats"
        className="border-b border-edge bg-basalt-deep"
      >
        <TrailStatBand stats={stats} />
      </section>

      {/* ------------------------------------------------ map / chart / rail */}
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <section
          aria-label="Route map, elevation profile, and rig check"
          className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]"
        >
          <TrailDetailView trail={trail} />
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <RequirementsPanel trail={trail} />
            <TrailCallouts trail={trail} />
          </aside>
        </section>

        <hr className="divider-route my-12" />

        {/* ------------------------------------------------ trail notes */}
        <section aria-label="Trail notes" className="max-w-3xl">
          <p className="stat-label">Trail notes</p>
          <h2 className="heading-display mt-2 text-3xl sm:text-4xl">
            Know before you go
          </h2>
          <p className="mt-4 text-base leading-7 text-sand">{trail.description}</p>
          {trail.dataSource ? (
            <p className="readout mt-6 text-xs text-sand-dim">
              Route data: {trail.dataSource.name}
              {trail.dataSource.attribution
                ? ` · ${trail.dataSource.attribution}`
                : ""}{" "}
              · {trail.dataSource.license}. Simplified for planning, not for
              navigation.
            </p>
          ) : null}
        </section>
      </div>

      {/* ------------------------------------------------ sticky CTA */}
      <PlanCta trail={trail} />
    </div>
  );
}
