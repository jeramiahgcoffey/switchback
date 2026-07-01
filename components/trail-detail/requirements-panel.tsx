"use client";

import Link from "next/link";
import type { Readiness, ReadinessStatus, Trail } from "@/lib/types";
import { matchRigToTrail } from "@/lib/derive";
import { useActiveRig } from "@/lib/storage";

/**
 * Requirements panel — pass/warn/fail rows from the shared
 * matchRigToTrail() against the active rig in localStorage. The storage hook
 * falls back to the Stock Wrangler Sport on the server and during hydration,
 * so the panel is always meaningful and never mismatches.
 */

const STATUS_META: Record<
  ReadinessStatus,
  { word: string; text: string; ring: string }
> = {
  pass: { word: "PASS", text: "text-sage-bright", ring: "border-sage/60 bg-sage/15" },
  warn: { word: "WARN", text: "text-amber", ring: "border-amber/60 bg-amber/15" },
  fail: { word: "FAIL", text: "text-rust-bright", ring: "border-rust/70 bg-rust/20" },
};

const VERDICT_META: Record<
  Readiness["verdict"],
  { word: string; text: string; panel: string }
> = {
  go: {
    word: "Good to go",
    text: "text-sage-bright",
    panel: "border-sage/40 bg-sage/10",
  },
  caution: {
    word: "Caution",
    text: "text-amber",
    panel: "border-amber/40 bg-amber/10",
  },
  "no-go": {
    word: "Not recommended",
    text: "text-rust-bright",
    panel: "border-rust/50 bg-rust/15",
  },
};

function StatusIcon({ status }: { status: ReadinessStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      aria-hidden
      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${meta.ring}`}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={meta.text}>
        {status === "pass" ? (
          <path
            d="M1.5 5.2 4 7.7 8.5 2.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : status === "warn" ? (
          <path
            d="M5 1.5v4.2M5 8.2v.3"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        ) : (
          <path
            d="M2 2l6 6M8 2 2 8"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        )}
      </svg>
    </span>
  );
}

export function RequirementsPanel({ trail }: { trail: Trail }) {
  const { rig, hydrated } = useActiveRig();
  const readiness = matchRigToTrail(rig, trail);
  const verdict = VERDICT_META[readiness.verdict];
  const passCount = readiness.reasons.filter((r) => r.status === "pass").length;

  return (
    <section aria-label="Rig requirements check" className="card-surface overflow-hidden">
      <header className="flex items-baseline justify-between border-b border-edge px-5 py-4">
        <h2 className="stat-label">Rig check</h2>
        <p className="readout text-xs text-sand-dim">
          {passCount}/{readiness.reasons.length} PASS
        </p>
      </header>

      <div className={`border-b px-5 py-4 ${verdict.panel}`}>
        <p className={`heading-display text-2xl ${verdict.text}`}>{verdict.word}</p>
        <p className="readout mt-1.5 text-[11px] text-sand-dim">
          {rig.name.toUpperCase()} · {rig.tireIn}&quot; TIRES · {rig.clearanceIn}&quot; CLR ·{" "}
          {rig.fuelRangeMiles} MI RANGE
        </p>
        {!hydrated ? (
          <p className="mt-1 text-[11px] text-sand-dim">Checking your garage…</p>
        ) : null}
      </div>

      <ul className="divide-y divide-edge">
        {readiness.reasons.map((reason) => {
          const meta = STATUS_META[reason.status];
          return (
            <li key={reason.label} className="flex gap-3 px-5 py-3">
              <StatusIcon status={reason.status} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-display text-sm font-semibold uppercase tracking-[0.1em] text-bone">
                    {reason.label}
                  </p>
                  <p className={`readout text-[11px] ${meta.text}`}>{meta.word}</p>
                </div>
                <p className="mt-0.5 text-xs leading-5 text-sand-dim">{reason.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <footer className="border-t border-edge px-5 py-3">
        <Link
          href="/garage"
          className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-ember-bright transition-colors duration-150 hover:text-ember"
        >
          Tune your rig in the Garage →
        </Link>
      </footer>
    </section>
  );
}
