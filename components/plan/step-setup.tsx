"use client";

/**
 * Step 1: Route & Crew. Pick/confirm the trail (pre-seeded from ?trail=),
 * set a start date (season is derived from it), party size, and rig.
 * Rig options carry a live readiness verdict against the chosen trail.
 */
import { formatCoords, matchRigToTrail } from "@/lib/derive";
import { rigs } from "@/lib/data/rigs";
import { trails } from "@/lib/data/trails";
import type { RigProfile, Season, Trail } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { DifficultyDiamonds } from "@/components/ui/difficulty";
import { AlertIcon } from "./plan-icons";
import { SEASON_LABEL } from "./wizard-shared";

const VERDICT_META = {
  go: { label: "Good to go", tone: "sage" as const },
  caution: { label: "Caution", tone: "amber" as const },
  "no-go": { label: "Not recommended", tone: "rust" as const },
};

function SectionHeading({
  index,
  title,
  hint,
}: {
  index: string;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="readout text-xs text-ember-bright">{index}</span>
      <h2 className="heading-display text-xl">{title}</h2>
      {hint && <span className="text-xs text-sand-dim">{hint}</span>}
    </div>
  );
}

function TrailOption({
  trail,
  selected,
  onSelect,
}: {
  trail: Trail;
  selected: boolean;
  onSelect: () => void;
}) {
  const head = trail.waypoints.find((w) => w.kind === "trailhead");
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`card-surface hover-lift flex flex-col gap-2 p-4 text-left ${
        selected ? "border-ember shadow-[0_0_0_1px_var(--color-ember)]" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="heading-display block truncate text-base leading-tight">
            {trail.name}
          </span>
          <span className="readout mt-0.5 block text-[0.65rem] text-sand-dim">
            {formatCoords(head?.lat ?? trail.track[0].lat, head?.lng ?? trail.track[0].lng)}
          </span>
        </div>
        <span
          aria-hidden
          className={`mt-1 h-3 w-3 shrink-0 rotate-45 border transition-colors duration-150 ${
            selected ? "border-ember bg-ember" : "border-edge-strong"
          }`}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <DifficultyDiamonds level={trail.difficulty} />
        <span className="readout text-[0.7rem] text-sand">
          {trail.distanceMiles} MI · {trail.estimatedDays}D · {trail.state}
        </span>
      </div>
    </button>
  );
}

function RigOption({
  rig,
  selected,
  isGarageRig,
  trail,
  onSelect,
}: {
  rig: RigProfile;
  selected: boolean;
  isGarageRig: boolean;
  trail: Trail | undefined;
  onSelect: () => void;
}) {
  const readiness = trail ? matchRigToTrail(rig, trail) : null;
  const verdict = readiness ? VERDICT_META[readiness.verdict] : null;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`card-surface hover-lift flex flex-col gap-3 p-4 text-left ${
        selected ? "border-ember shadow-[0_0_0_1px_var(--color-ember)]" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="heading-display block text-base leading-tight">
            {rig.name}
          </span>
          <span className="mt-0.5 block truncate text-xs text-sand-dim">
            {rig.vehicle}
          </span>
        </div>
        {isGarageRig && <Badge tone="ember">Garage</Badge>}
      </div>
      <div className="readout flex flex-wrap gap-x-3 gap-y-1 text-[0.7rem] text-sand">
        <span>{rig.tireIn}&quot; TIRES</span>
        <span>{rig.clearanceIn}&quot; CLR</span>
        <span>{rig.fuelRangeMiles} MI RANGE</span>
      </div>
      <div className="flex items-center justify-between border-t border-edge pt-2.5">
        <span className="text-[0.7rem] text-sand-dim">
          {[
            rig.hasWinch ? "Winch" : null,
            rig.hasLockers ? "Lockers" : null,
            rig.hasFourLo ? "4-Lo" : null,
          ]
            .filter(Boolean)
            .join(" · ") || "No recovery hardware"}
        </span>
        {verdict && <Badge tone={verdict.tone}>{verdict.label}</Badge>}
      </div>
    </button>
  );
}

export function StepSetup({
  trailSlug,
  startDate,
  partySize,
  rigId,
  season,
  selectedTrail,
  garageRigId,
  resolveRig,
  onSelectTrail,
  onStartDate,
  onPartySize,
  onRigId,
}: {
  trailSlug: string | null;
  startDate: string;
  partySize: number;
  rigId: string;
  season: Season;
  selectedTrail: Trail | undefined;
  garageRigId: string;
  resolveRig: (id: string) => RigProfile;
  onSelectTrail: (slug: string) => void;
  onStartDate: (iso: string) => void;
  onPartySize: (n: number) => void;
  onRigId: (id: string) => void;
}) {
  const offSeason =
    selectedTrail && !selectedTrail.seasons.includes(season);

  return (
    <div className="flex flex-col gap-10">
      {/* Trail */}
      <section aria-label="Choose your trail">
        <SectionHeading
          index="01"
          title="Choose your trail"
          hint={selectedTrail ? selectedTrail.region : "12 curated routes"}
        />
        <div
          role="radiogroup"
          aria-label="Trail"
          className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {trails.map((t) => (
            <TrailOption
              key={t.slug}
              trail={t}
              selected={t.slug === trailSlug}
              onSelect={() => onSelectTrail(t.slug)}
            />
          ))}
        </div>
      </section>

      <hr className="divider-route" />

      {/* Date + party */}
      <section aria-label="Trip dates and party">
        <SectionHeading index="02" title="Date & crew" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="card-surface p-4">
            <label htmlFor="plan-start-date" className="stat-label block">
              Departure
            </label>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <input
                id="plan-start-date"
                type="date"
                value={startDate}
                onChange={(e) => e.target.value && onStartDate(e.target.value)}
                className="readout rounded border border-edge-strong bg-basalt px-3 py-2 text-sm outline-none transition-colors duration-150 focus:border-ember"
                style={{ colorScheme: "dark" }}
              />
              <Badge tone={offSeason ? "amber" : "sage"}>
                {SEASON_LABEL[season]} conditions
              </Badge>
            </div>
            {offSeason && selectedTrail && (
              <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-amber">
                <AlertIcon size={14} className="mt-0.5 shrink-0" />
                <span>
                  {selectedTrail.name} runs{" "}
                  {selectedTrail.seasons.map((s) => SEASON_LABEL[s]).join(" / ")}.{" "}
                  A {SEASON_LABEL[season].toLowerCase()} start is outside the
                  usual window. Expect closures or rough conditions.
                </span>
              </p>
            )}
          </div>

          <div className="card-surface p-4">
            <span id="plan-party-label" className="stat-label block">
              Party size
            </span>
            <div
              className="mt-3 inline-flex items-center gap-1 rounded border border-edge-strong"
              role="group"
              aria-labelledby="plan-party-label"
            >
              <button
                type="button"
                onClick={() => onPartySize(Math.max(1, partySize - 1))}
                disabled={partySize <= 1}
                aria-label="Fewer people"
                className="px-3.5 py-2 font-mono text-lg text-sand transition-colors duration-150 hover:text-ember-bright disabled:opacity-30"
              >
                −
              </button>
              <span className="readout w-10 text-center text-lg" aria-live="polite">
                {partySize}
              </span>
              <button
                type="button"
                onClick={() => onPartySize(Math.min(6, partySize + 1))}
                disabled={partySize >= 6}
                aria-label="More people"
                className="px-3.5 py-2 font-mono text-lg text-sand transition-colors duration-150 hover:text-ember-bright disabled:opacity-30"
              >
                +
              </button>
            </div>
            <p className="mt-3 text-xs text-sand-dim">
              Water, sleep systems, and per-person gear scale with the crew.
            </p>
          </div>
        </div>
      </section>

      <hr className="divider-route" />

      {/* Rig */}
      <section aria-label="Choose your rig">
        <SectionHeading
          index="03"
          title="Ready the rig"
          hint="Verdicts update with the trail"
        />
        <div
          role="radiogroup"
          aria-label="Rig"
          className="mt-4 grid gap-3 md:grid-cols-3"
        >
          {rigs.map((preset) => {
            const resolved = resolveRig(preset.id);
            return (
              <RigOption
                key={preset.id}
                rig={resolved}
                selected={preset.id === rigId}
                isGarageRig={preset.id === garageRigId}
                trail={selectedTrail}
                onSelect={() => onRigId(preset.id)}
              />
            );
          })}
        </div>
        <p className="mt-3 text-xs text-sand-dim">
          The <span className="text-sand">Garage</span> tag marks your active
          build. Spec edits made there carry into fuel math here.
        </p>
      </section>
    </div>
  );
}
