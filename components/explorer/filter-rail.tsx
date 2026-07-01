"use client";

/**
 * Explorer filter rail: difficulty, terrain, season, trip length, state.
 * Fully controlled: reads `filters`, emits complete next states via
 * `onChange`; the orchestrator syncs them into URL searchParams.
 * Facet counts are honest ("what would this click yield?"), so a chip
 * showing 0 tells you the combination is empty before you try it.
 */

import type { ReactNode } from "react";
import { trails } from "@/lib/data/trails";
import { DIFFICULTY_META } from "@/components/ui/difficulty";
import {
  DIFFICULTY_OPTIONS,
  LENGTH_LABEL,
  LENGTH_OPTIONS,
  SEASON_LABEL,
  SEASON_OPTIONS,
  STATE_OPTIONS,
  TERRAIN_LABEL,
  TERRAIN_OPTIONS,
  countActiveFilters,
  facetOptionCount,
  toggleFacetOption,
  type ExplorerFilters,
  type FacetKey,
} from "@/components/explorer/filters";

const CHIP_BASE =
  "inline-flex items-center gap-1.5 rounded border px-2 py-1 font-display text-[0.7rem] font-semibold uppercase tracking-[0.1em] transition-colors duration-150 ease-out";
const CHIP_OFF = "border-edge bg-gunmetal text-sand-dim hover:border-edge-strong hover:text-bone";
const CHIP_ON = "border-ember/60 bg-ember/10 text-bone";

function FacetSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="stat-label">{title}</legend>
      <div className="mt-2.5">{children}</div>
    </fieldset>
  );
}

function OptionChip({
  active,
  count,
  label,
  onToggle,
  title,
}: {
  active: boolean;
  count: number;
  label: string;
  onToggle: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      title={title}
      onClick={onToggle}
      className={`${CHIP_BASE} ${active ? CHIP_ON : CHIP_OFF} ${
        count === 0 && !active ? "opacity-45" : ""
      }`}
    >
      {label}
      <span className={`readout text-[0.65rem] ${active ? "text-ember-bright" : "text-sand-dim"}`}>
        {count}
      </span>
    </button>
  );
}

export function FilterRail({
  filters,
  onChange,
  className = "",
}: {
  filters: ExplorerFilters;
  onChange: (next: ExplorerFilters) => void;
  className?: string;
}) {
  const activeCount = countActiveFilters(filters);
  const toggle = (facet: FacetKey, option: string | number) =>
    onChange(toggleFacetOption(filters, facet, option));
  const count = (facet: FacetKey, option: string | number) =>
    facetOptionCount(trails, filters, facet, option);

  return (
    <aside aria-label="Trail filters" className={className}>
      <div className="flex items-center justify-between">
        <p className="heading-display text-lg">Filters</p>
        {activeCount > 0 ? (
          <button
            type="button"
            onClick={() => onChange({ difficulty: [], terrain: [], seasons: [], lengths: [], states: [] })}
            className="font-display text-xs font-semibold uppercase tracking-[0.12em] text-ember-bright transition-colors duration-150 hover:text-ember"
          >
            Clear ({activeCount})
          </button>
        ) : null}
      </div>

      <hr className="divider-route my-4" />

      <div className="space-y-6">
        <FacetSection title="Difficulty">
          <div className="flex flex-wrap gap-1.5">
            {DIFFICULTY_OPTIONS.map((level) => {
              const active = filters.difficulty.includes(level);
              const n = count("difficulty", level);
              return (
                <button
                  key={level}
                  type="button"
                  aria-pressed={active}
                  title={`${DIFFICULTY_META[level].label}: ${n} trail${n === 1 ? "" : "s"}`}
                  onClick={() => toggle("difficulty", level)}
                  className={`${CHIP_BASE} ${active ? CHIP_ON : CHIP_OFF} ${
                    n === 0 && !active ? "opacity-45" : ""
                  }`}
                >
                  <span
                    aria-hidden
                    className={`h-2 w-2 rotate-45 ${DIFFICULTY_META[level].fill}`}
                  />
                  {level}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[0.7rem] text-sand-dim">
            1 graded dirt → 5 technical rock
          </p>
        </FacetSection>

        <FacetSection title="Terrain">
          <div className="flex flex-wrap gap-1.5">
            {TERRAIN_OPTIONS.map((t) => (
              <OptionChip
                key={t}
                active={filters.terrain.includes(t)}
                count={count("terrain", t)}
                label={TERRAIN_LABEL[t]}
                onToggle={() => toggle("terrain", t)}
              />
            ))}
          </div>
        </FacetSection>

        <FacetSection title="Season">
          <div className="flex flex-wrap gap-1.5">
            {SEASON_OPTIONS.map((s) => (
              <OptionChip
                key={s}
                active={filters.seasons.includes(s)}
                count={count("seasons", s)}
                label={SEASON_LABEL[s]}
                onToggle={() => toggle("seasons", s)}
              />
            ))}
          </div>
        </FacetSection>

        <FacetSection title="Trip length">
          <div className="space-y-1.5">
            {LENGTH_OPTIONS.map((len) => {
              const active = filters.lengths.includes(len);
              const n = count("lengths", len);
              return (
                <button
                  key={len}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggle("lengths", len)}
                  className={`flex w-full items-center justify-between gap-2 rounded border px-2.5 py-1.5 text-left transition-colors duration-150 ease-out ${
                    active ? CHIP_ON : CHIP_OFF
                  } ${n === 0 && !active ? "opacity-45" : ""}`}
                >
                  <span className="font-display text-[0.7rem] font-semibold uppercase tracking-[0.1em]">
                    {LENGTH_LABEL[len].label}
                    <span className="ml-1.5 normal-case tracking-normal text-sand-dim">
                      {LENGTH_LABEL[len].hint}
                    </span>
                  </span>
                  <span
                    className={`readout text-[0.65rem] ${active ? "text-ember-bright" : "text-sand-dim"}`}
                  >
                    {n}
                  </span>
                </button>
              );
            })}
          </div>
        </FacetSection>

        <FacetSection title="State">
          <div className="flex flex-wrap gap-1.5">
            {STATE_OPTIONS.map((st) => (
              <OptionChip
                key={st}
                active={filters.states.includes(st)}
                count={count("states", st)}
                label={st}
                onToggle={() => toggle("states", st)}
              />
            ))}
          </div>
        </FacetSection>
      </div>
    </aside>
  );
}
