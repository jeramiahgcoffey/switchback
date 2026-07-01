"use client";

import type { RigProfile } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { TickGauge } from "@/components/garage/tick-gauge";
import { SpecToggle } from "@/components/garage/spec-toggle";

export type NumericSpecKey =
  | "tireIn"
  | "clearanceIn"
  | "fuelRangeMiles"
  | "payloadLbs";
export type BooleanSpecKey = "hasWinch" | "hasLockers" | "hasFourLo";

const GAUGES: {
  key: NumericSpecKey;
  label: string;
  min: number;
  max: number;
  step: number;
  ticks: number;
  majorEvery: number;
  format: (v: number) => string;
}[] = [
  {
    key: "tireIn",
    label: "Tire diameter",
    min: 28,
    max: 40,
    step: 1,
    ticks: 13,
    majorEvery: 2,
    format: (v) => `${v}"`,
  },
  {
    key: "clearanceIn",
    label: "Ground clearance",
    min: 8,
    max: 14,
    step: 0.1,
    ticks: 25,
    majorEvery: 4,
    format: (v) => `${v.toFixed(1)}"`,
  },
  {
    key: "fuelRangeMiles",
    label: "Fuel range",
    min: 200,
    max: 700,
    step: 10,
    ticks: 26,
    majorEvery: 5,
    format: (v) => `${Math.round(v).toLocaleString("en-US")} mi`,
  },
  {
    key: "payloadLbs",
    label: "Payload",
    min: 500,
    max: 2000,
    step: 25,
    ticks: 31,
    majorEvery: 5,
    format: (v) => `${Math.round(v).toLocaleString("en-US")} lb`,
  },
];

const TOGGLES: { key: BooleanSpecKey; label: string }[] = [
  { key: "hasWinch", label: "Winch" },
  { key: "hasLockers", label: "Lockers" },
  { key: "hasFourLo", label: "4-Lo transfer case" },
];

/**
 * Instrument-panel spec sheet: mono readouts, tick-mark gauges, equipment
 * rockers. Edits layer over the chosen preset as `customSpecs` and persist
 * app-wide via the shared rig hook.
 */
export function SpecPanel({
  rig,
  preset,
  modified,
  onNumericSpec,
  onBooleanSpec,
  onReset,
}: {
  /** Resolved rig = preset + custom spec overrides. */
  rig: RigProfile;
  /** The unedited preset underneath. */
  preset: RigProfile;
  modified: boolean;
  onNumericSpec: (key: NumericSpecKey, value: number) => void;
  onBooleanSpec: (key: BooleanSpecKey, value: boolean) => void;
  onReset: () => void;
}) {
  return (
    <div className="card-surface">
      {/* panel header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <h3 className="heading-display text-xl">{rig.name}</h3>
          {modified ? <Badge tone="ember">Modified</Badge> : <Badge>Stock</Badge>}
        </div>
        <div className="flex items-center gap-3">
          <p className="hidden text-xs text-sand-dim md:block">{rig.vehicle}</p>
          {modified ? (
            <button
              type="button"
              onClick={onReset}
              className="rounded border border-edge-strong px-2.5 py-1 font-display text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-sand transition-colors duration-150 ease-out hover:border-ember hover:text-ember-bright"
            >
              Reset to stock
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-x-8 gap-y-6 p-4 sm:p-5 lg:grid-cols-[1fr_16rem]">
        {/* gauges */}
        <div className="grid gap-6 sm:grid-cols-2">
          {GAUGES.map((g) => (
            <TickGauge
              key={g.key}
              label={g.label}
              value={rig[g.key]}
              min={g.min}
              max={g.max}
              step={g.step}
              ticks={g.ticks}
              majorEvery={g.majorEvery}
              format={g.format}
              stockValue={preset[g.key]}
              onChange={(v) => onNumericSpec(g.key, v)}
            />
          ))}
        </div>

        {/* equipment rockers */}
        <div className="flex flex-col gap-2.5 border-t border-edge pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <p className="stat-label">Equipment</p>
          {TOGGLES.map((t) => (
            <SpecToggle
              key={t.key}
              label={t.label}
              on={rig[t.key]}
              stockOn={preset[t.key]}
              onChange={(v) => onBooleanSpec(t.key, v)}
            />
          ))}
        </div>
      </div>

      {/* summary strip: the whole sheet in one mono line */}
      <div className="border-t border-edge bg-basalt-deep/50 px-4 py-2.5 sm:px-5">
        <p className="readout text-[11px] text-sand-dim">
          {rig.tireIn}&quot; TIRES · {rig.clearanceIn.toFixed(1)}&quot; CLNC ·{" "}
          {rig.hasFourLo ? "4-LO" : "NO 4-LO"} ·{" "}
          {rig.hasLockers ? "LOCKERS" : "OPEN DIFFS"} ·{" "}
          {rig.hasWinch ? "WINCH" : "NO WINCH"} · {rig.fuelRangeMiles} MI RANGE ·{" "}
          {rig.payloadLbs.toLocaleString("en-US")} LB PAYLOAD
        </p>
      </div>
    </div>
  );
}
