"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Readiness, RigProfile, Trail } from "@/lib/types";
import { trails } from "@/lib/data/trails";
import { matchRigToTrail } from "@/lib/derive";
import { DifficultyDiamonds } from "@/components/ui/difficulty";
import { CountUp } from "@/components/garage/count-up";
import { VERDICT_META } from "@/components/garage/gear-meta";
import {
  IconAlert,
  IconCheck,
  IconChevronDown,
  IconX,
  StatusGlyph,
} from "@/components/garage/icons";

/** Column order mirrors the reasons array from matchRigToTrail(). */
const CHECK_COLUMNS = ["Tires", "Clnc", "4-Lo", "Lkrs", "Wnch", "Fuel"];

function VerdictBadge({ verdict }: { verdict: Readiness["verdict"] }) {
  const meta = VERDICT_META[verdict];
  const Icon =
    verdict === "go" ? IconCheck : verdict === "caution" ? IconAlert : IconX;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-display text-[0.7rem] font-semibold uppercase tracking-[0.12em] ${meta.badge}`}
    >
      <Icon size={12} />
      {meta.label}
    </span>
  );
}

function MatrixRow({
  trail,
  readiness,
  expanded,
  onToggle,
}: {
  trail: Trail;
  readiness: Readiness;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="border-t border-edge first:border-t-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={`grid w-full grid-cols-[1fr_auto_1.25rem] items-center gap-x-3 px-4 py-3 text-left transition-colors duration-150 ease-out hover:bg-gunmetal-light/50 sm:px-5 md:grid-cols-[minmax(0,1fr)_repeat(6,2.25rem)_5.5rem_1.25rem]`}
      >
        <span className="min-w-0">
          <span className="flex items-center gap-2.5">
            <span className="truncate font-display text-base font-semibold uppercase tracking-[0.04em] text-bone">
              {trail.name}
            </span>
            <DifficultyDiamonds level={trail.difficulty} className="hidden sm:inline-flex" />
          </span>
          <span className="readout mt-0.5 block text-[11px] text-sand-dim">
            {trail.state} · {trail.distanceMiles} MI · DIFF {trail.difficulty}
          </span>
        </span>

        {/* six per-check glyphs (md+) */}
        {readiness.reasons.map((r) => (
          <span key={r.label} className="hidden justify-center md:flex">
            <StatusGlyph status={r.status} />
          </span>
        ))}

        <span className="justify-self-end md:justify-self-center">
          <VerdictBadge verdict={readiness.verdict} />
        </span>
        <IconChevronDown
          size={14}
          className={`justify-self-end text-sand-dim transition-transform duration-200 ease-out ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* itemized per-requirement reasons */}
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-edge bg-basalt-deep/40 px-4 py-4 sm:px-5">
            <ul className="grid gap-x-8 gap-y-2.5 lg:grid-cols-2">
              {readiness.reasons.map((r) => (
                <li key={r.label} className="flex items-start gap-2.5">
                  <StatusGlyph status={r.status} className="mt-0.5 shrink-0" />
                  <p className="text-sm leading-snug text-sand">
                    <span className="stat-label mr-2 !text-sand-dim">
                      {r.label}
                    </span>
                    {r.detail}
                  </p>
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t border-edge pt-3">
              <Link
                href={`/trails/${trail.slug}`}
                className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-ember-bright transition-colors duration-150 hover:text-ember"
              >
                View trail →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

/**
 * Readiness matrix: matchRigToTrail() mapped across all 12 trails.
 * Pure derived state. Re-scores live as the spec sheet changes.
 */
export function ReadinessMatrix({ rig }: { rig: RigProfile }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const rows = useMemo(
    () => trails.map((trail) => ({ trail, readiness: matchRigToTrail(rig, trail) })),
    // matchRigToTrail only reads these primitives; the rig object identity churns.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      rig.tireIn,
      rig.clearanceIn,
      rig.hasWinch,
      rig.hasLockers,
      rig.hasFourLo,
      rig.fuelRangeMiles,
      rig.payloadLbs,
    ],
  );

  const counts = rows.reduce(
    (acc, r) => {
      acc[r.readiness.verdict] += 1;
      return acc;
    },
    { go: 0, caution: 0, "no-go": 0 },
  );

  return (
    <div>
      {/* verdict summary band */}
      <div className="grid grid-cols-3 gap-4">
        {(["go", "caution", "no-go"] as const).map((v) => {
          const meta = VERDICT_META[v];
          const Icon = v === "go" ? IconCheck : v === "caution" ? IconAlert : IconX;
          return (
            <div key={v} className="card-surface px-4 py-4 sm:px-5">
              <p className={`readout text-3xl sm:text-4xl ${meta.text}`}>
                <CountUp value={counts[v]} />
                <span className="ml-1.5 text-sm text-sand-dim">
                  / {trails.length}
                </span>
              </p>
              <p className={`mt-2 flex items-center gap-1.5 ${meta.text}`}>
                <Icon size={13} />
                <span className="stat-label !text-inherit">{meta.label}</span>
              </p>
            </div>
          );
        })}
      </div>

      {/* the matrix */}
      <div className="card-surface mt-6 overflow-hidden">
        <div className="hidden grid-cols-[minmax(0,1fr)_repeat(6,2.25rem)_5.5rem_1.25rem] gap-x-3 border-b border-edge bg-basalt-deep/50 px-4 py-2 sm:px-5 md:grid">
          <span className="stat-label !text-[0.65rem]">Trail</span>
          {CHECK_COLUMNS.map((c) => (
            <span key={c} className="stat-label text-center !text-[0.65rem]">
              {c}
            </span>
          ))}
          <span className="stat-label text-center !text-[0.65rem]">Verdict</span>
          <span aria-hidden />
        </div>
        <ul>
          {rows.map(({ trail, readiness }) => (
            <MatrixRow
              key={trail.id}
              trail={trail}
              readiness={readiness}
              expanded={expandedId === trail.id}
              onToggle={() =>
                setExpandedId((prev) => (prev === trail.id ? null : trail.id))
              }
            />
          ))}
        </ul>
      </div>
    </div>
  );
}
