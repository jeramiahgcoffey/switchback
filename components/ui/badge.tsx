import type { ReactNode } from "react";

export type BadgeTone =
  | "ember"
  | "sage"
  | "amber"
  | "rust"
  | "sand"
  | "neutral";

const TONES: Record<BadgeTone, string> = {
  ember: "border-ember/50 bg-ember/15 text-ember-bright",
  sage: "border-sage/50 bg-sage/15 text-sage-bright",
  amber: "border-amber/50 bg-amber/15 text-amber",
  rust: "border-rust/60 bg-rust/20 text-rust-bright",
  sand: "border-sand/40 bg-sand/10 text-sand",
  neutral: "border-edge bg-gunmetal-light text-sand-dim",
};

export function Badge({
  tone = "neutral",
  className = "",
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 font-display text-[0.7rem] font-semibold uppercase tracking-[0.12em] ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
