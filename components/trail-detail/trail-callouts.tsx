import type { CellCoverage, Season, Trail } from "@/lib/types";

/**
 * Season window, cell coverage, and resupply-gap callouts. Pure markup that
 * renders on the server with the statically generated page.
 */

const SEASONS: { key: Season; label: string }[] = [
  { key: "spring", label: "Spring" },
  { key: "summer", label: "Summer" },
  { key: "fall", label: "Fall" },
  { key: "winter", label: "Winter" },
];

const COVERAGE_META: Record<
  CellCoverage,
  { label: string; bars: number; text: string; note: string }
> = {
  none: {
    label: "No service",
    bars: 0,
    text: "text-rust-bright",
    note: "Dead air the whole way. Download offline maps and leave a trip plan with someone before you drop in.",
  },
  spotty: {
    label: "Spotty",
    bars: 1,
    text: "text-amber",
    note: "Signal at ridgelines and pass tops only. Don't bet a recovery on it.",
  },
  good: {
    label: "Good",
    bars: 3,
    text: "text-sage-bright",
    note: "Workable signal along most of the route.",
  },
};

function CoverageBars({ bars }: { bars: number }) {
  return (
    <span aria-hidden className="flex items-end gap-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`w-1.5 rounded-sm ${i < bars ? "bg-sage" : "bg-gunmetal-light border border-edge-strong"}`}
          style={{ height: 5 + i * 4 }}
        />
      ))}
    </span>
  );
}

export function TrailCallouts({ trail }: { trail: Trail }) {
  const coverage = COVERAGE_META[trail.cellCoverage];
  const openSeasons = SEASONS.filter((s) => trail.seasons.includes(s.key));

  return (
    <section aria-label="Trail conditions" className="card-surface overflow-hidden">
      <header className="border-b border-edge px-5 py-4">
        <h2 className="stat-label">Conditions</h2>
      </header>

      <div className="space-y-5 px-5 py-5">
        {/* season window */}
        <div>
          <p className="font-display text-xs font-semibold uppercase tracking-[0.12em] text-sand-dim">
            Season window
          </p>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {SEASONS.map((s) => {
              const open = trail.seasons.includes(s.key);
              return (
                <span
                  key={s.key}
                  className={`rounded border px-1 py-1.5 text-center font-display text-[10px] font-semibold uppercase tracking-[0.1em] ${
                    open
                      ? "border-sage/50 bg-sage/15 text-sage-bright"
                      : "border-edge bg-gunmetal-light/50 text-sand-dim/60"
                  }`}
                >
                  {s.label}
                </span>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] leading-4 text-sand-dim">
            Runs best in {openSeasons.map((s) => s.label.toLowerCase()).join(" & ")}.
          </p>
        </div>

        <hr className="border-edge" />

        {/* cell coverage */}
        <div>
          <p className="font-display text-xs font-semibold uppercase tracking-[0.12em] text-sand-dim">
            Cell coverage
          </p>
          <div className="mt-2 flex items-center gap-2.5">
            <CoverageBars bars={coverage.bars} />
            <span className={`readout text-sm ${coverage.text}`}>
              {coverage.label.toUpperCase()}
            </span>
          </div>
          <p className="mt-2 text-[11px] leading-4 text-sand-dim">{coverage.note}</p>
        </div>

        <hr className="border-edge" />

        {/* resupply gap */}
        <div>
          <p className="font-display text-xs font-semibold uppercase tracking-[0.12em] text-sand-dim">
            Longest resupply gap
          </p>
          <p className="readout mt-1 text-2xl">
            {trail.longestResupplyGapMiles.toLocaleString("en-US")}
            <span className="ml-1.5 text-sm text-sand-dim">mi</span>
          </p>
          <p className="mt-1 text-[11px] leading-4 text-sand-dim">
            Longest stretch without a fuel or water opportunity. Do the range
            math before you commit.
          </p>
        </div>
      </div>
    </section>
  );
}
