"use client";

import type { RigProfile } from "@/lib/types";
import { rigs } from "@/lib/data/rigs";
import { Badge } from "@/components/ui/badge";

function EquipChip({ label, on }: { label: string; on: boolean }) {
  return (
    <span
      className={`rounded border px-1.5 py-0.5 font-display text-[0.6rem] font-semibold uppercase tracking-[0.12em] ${
        on
          ? "border-sage/50 bg-sage/10 text-sage-bright"
          : "border-edge text-sand-dim/70 line-through"
      }`}
    >
      {label}
    </span>
  );
}

function SpecCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="readout text-sm">{value}</p>
      <p className="stat-label mt-0.5 !text-[0.6rem]">{label}</p>
    </div>
  );
}

/** Three preset cards — picking one becomes the active rig app-wide. */
export function RigSelector({
  activeRigId,
  modified,
  onSelect,
}: {
  activeRigId: string;
  /** Whether the active preset carries custom spec edits. */
  modified: boolean;
  onSelect: (rig: RigProfile) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {rigs.map((rig) => {
        const active = rig.id === activeRigId;
        return (
          <button
            key={rig.id}
            type="button"
            onClick={() => onSelect(rig)}
            aria-pressed={active}
            className={`card-surface hover-lift flex h-full flex-col p-4 text-left sm:p-5 ${
              active ? "!border-ember/70 shadow-[0_0_0_1px_var(--color-ember)]" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3
                  className={`heading-display text-xl leading-tight ${
                    active ? "text-ember-bright" : ""
                  }`}
                >
                  {rig.name}
                </h3>
                <p className="mt-1 text-xs text-sand-dim">{rig.vehicle}</p>
              </div>
              {active ? (
                <Badge tone="ember">{modified ? "Active · Edited" : "Active"}</Badge>
              ) : null}
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2 border-t border-edge pt-3">
              <SpecCell label="Tires" value={`${rig.tireIn}"`} />
              <SpecCell label="Clnc" value={`${rig.clearanceIn}"`} />
              <SpecCell label="Range" value={`${rig.fuelRangeMiles}`} />
              <SpecCell label="Payload" value={rig.payloadLbs.toLocaleString("en-US")} />
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <EquipChip label="Winch" on={rig.hasWinch} />
              <EquipChip label="Lockers" on={rig.hasLockers} />
              <EquipChip label="4-Lo" on={rig.hasFourLo} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
