"use client";

/**
 * Explorer result card. Hovering (or keyboard-focusing) a card highlights its
 * marker on the overview map; hovering the marker highlights the card back.
 * Clicking anywhere deep-links to /trails/[slug].
 */

import Link from "next/link";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Card, CardBody, CardMedia } from "@/components/ui/card";
import { DifficultyDiamonds, DIFFICULTY_META } from "@/components/ui/difficulty";
import { formatCoords } from "@/lib/derive";
import type { Difficulty, Trail } from "@/lib/types";
import { ReadinessBadge } from "@/components/explorer/readiness-badge";
import { TERRAIN_LABEL } from "@/components/explorer/filters";

const DIFF_BADGE_TONE: Record<Difficulty, BadgeTone> = {
  1: "sage",
  2: "sand",
  3: "amber",
  4: "ember",
  5: "rust",
};

const COVERAGE_LABEL: Record<Trail["cellCoverage"], string> = {
  none: "no cell",
  spotty: "spotty cell",
  good: "good cell",
};

export function TrailCard({
  trail,
  active,
  onHoverChange,
  registerRef,
}: {
  trail: Trail;
  active: boolean;
  onHoverChange: (hovered: boolean) => void;
  registerRef: (el: HTMLElement | null) => void;
}) {
  const trailhead = trail.waypoints.find((w) => w.kind === "trailhead") ?? trail.waypoints[0];

  return (
    <article
      ref={registerRef}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      onFocus={() => onHoverChange(true)}
      onBlur={() => onHoverChange(false)}
      className="h-full scroll-mt-24"
    >
      <Link href={`/trails/${trail.slug}`} className="group block h-full">
        <Card
          lift
          className={`flex h-full flex-col transition-colors duration-150 ${
            active ? "border-ember/70 shadow-[0_10px_28px_rgb(0_0_0/0.35)]" : ""
          }`}
        >
          <CardMedia className="h-36 shrink-0">
            {/* Local, illustrative artwork — plain <img> keeps SVGs unoptimized-safe. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={trail.heroImage}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
            <span className="absolute left-3 top-3">
              <Badge tone={DIFF_BADGE_TONE[trail.difficulty]}>
                Diff {trail.difficulty} · {DIFFICULTY_META[trail.difficulty].label}
              </Badge>
            </span>
            <span className="absolute right-3 top-3">
              <ReadinessBadge trail={trail} />
            </span>
          </CardMedia>

          <CardBody className="flex flex-1 flex-col">
            <div className="flex items-start justify-between gap-3">
              <h3 className="heading-display text-xl leading-tight transition-colors duration-150 group-hover:text-ember-bright">
                {trail.name}
              </h3>
              <DifficultyDiamonds level={trail.difficulty} className="mt-1 shrink-0" />
            </div>
            {trailhead ? (
              <p className="readout mt-1 text-[0.7rem] text-sand-dim">
                {formatCoords(trailhead.lat, trailhead.lng)}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-sand-dim">
              {trail.region} · {trail.state}
            </p>
            <p className="mt-3 line-clamp-2 text-sm text-sand-dim">{trail.summary}</p>

            <div className="mb-4 mt-3 flex flex-wrap gap-1.5">
              {trail.terrain.map((t) => (
                <span
                  key={t}
                  className="rounded border border-edge bg-basalt px-1.5 py-0.5 font-display text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-sand-dim"
                >
                  {TERRAIN_LABEL[t]}
                </span>
              ))}
            </div>

            <div className="mt-auto flex items-center justify-between gap-2 border-t border-edge pt-3.5">
              <p className="readout text-xs">
                {trail.distanceMiles} mi · {trail.estimatedDays}d ·{" "}
                {trail.maxElevationFt.toLocaleString("en-US")} ft
              </p>
              <p className="readout text-[0.7rem] text-sand-dim">
                {COVERAGE_LABEL[trail.cellCoverage]}
              </p>
            </div>
          </CardBody>
        </Card>
      </Link>
    </article>
  );
}
