import type { Difficulty } from "@/lib/types";

/**
 * Ski-style difficulty diamonds on the sage -> sand -> amber -> ember ->
 * deep-red ramp, so severity reads at a glance across the whole app.
 */
export const DIFFICULTY_META: Record<
  Difficulty,
  { label: string; fill: string; text: string }
> = {
  1: { label: "Graded dirt", fill: "bg-sage", text: "text-sage-bright" },
  2: { label: "Moderate", fill: "bg-sand", text: "text-sand" },
  3: { label: "Challenging", fill: "bg-amber", text: "text-amber" },
  4: { label: "Difficult", fill: "bg-ember", text: "text-ember-bright" },
  5: { label: "Technical rock", fill: "bg-rust", text: "text-rust-bright" },
};

export function DifficultyDiamonds({
  level,
  className = "",
}: {
  level: Difficulty;
  className?: string;
}) {
  const meta = DIFFICULTY_META[level];
  return (
    <span
      className={`inline-flex items-center gap-1 ${className}`}
      role="img"
      aria-label={`Difficulty ${level} of 5 — ${meta.label}`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          aria-hidden
          className={`h-2 w-2 rotate-45 ${
            i <= level ? meta.fill : "border border-edge-strong bg-transparent"
          }`}
        />
      ))}
    </span>
  );
}

export function DifficultyChip({
  level,
  className = "",
}: {
  level: Difficulty;
  className?: string;
}) {
  const meta = DIFFICULTY_META[level];
  return (
    <span
      className={`card-surface inline-flex items-center gap-2 px-2.5 py-1 ${className}`}
    >
      <DifficultyDiamonds level={level} />
      <span
        className={`font-display text-[0.7rem] font-semibold uppercase tracking-[0.12em] ${meta.text}`}
      >
        {meta.label}
      </span>
    </span>
  );
}
