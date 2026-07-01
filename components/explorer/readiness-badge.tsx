"use client";

/**
 * Rig-readiness UI derived from the shared matchRigToTrail() against the
 * active rig in localStorage. Server render and first client paint use the
 * stock-preset fallback (no hydration mismatch); the badge settles to the
 * garage-selected rig immediately after hydration.
 */

import Link from "next/link";
import { useMemo } from "react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { matchRigToTrail } from "@/lib/derive";
import { useActiveRig } from "@/lib/storage";
import type { Readiness, Trail } from "@/lib/types";

const VERDICT_META: Record<
  Readiness["verdict"],
  { label: string; tone: BadgeTone }
> = {
  go: { label: "Good to go", tone: "sage" },
  caution: { label: "Caution", tone: "amber" },
  "no-go": { label: "Not for this rig", tone: "rust" },
};

export function ReadinessBadge({
  trail,
  className = "",
}: {
  trail: Trail;
  className?: string;
}) {
  const { rig } = useActiveRig();
  const readiness = useMemo(() => matchRigToTrail(rig, trail), [rig, trail]);
  const meta = VERDICT_META[readiness.verdict];
  const headline =
    readiness.reasons.find((r) => r.status === "fail") ??
    readiness.reasons.find((r) => r.status === "warn");

  return (
    <span
      className={`inline-flex ${className}`}
      title={`${rig.name} — ${headline ? headline.detail : "Every requirement checks out."}`}
    >
      <Badge tone={meta.tone}>
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
        {meta.label}
      </Badge>
    </span>
  );
}

/** Toolbar chip: which rig the readiness badges are scored against. */
export function ActiveRigChip({ className = "" }: { className?: string }) {
  const { rig } = useActiveRig();
  return (
    <Link
      href="/garage"
      className={`group inline-flex items-center gap-2 rounded border border-edge bg-gunmetal px-2.5 py-1.5 transition-colors duration-150 ease-out hover:border-ember/60 ${className}`}
      title="Change rig in the Garage"
    >
      <span className="stat-label text-[0.65rem]">Readiness vs</span>
      <span className="readout text-xs transition-colors duration-150 group-hover:text-ember-bright">
        {rig.name}
      </span>
      <span aria-hidden className="text-xs text-sand-dim transition-colors duration-150 group-hover:text-ember-bright">
        →
      </span>
    </Link>
  );
}
