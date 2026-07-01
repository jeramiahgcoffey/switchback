"use client";

import { useMemo, useState } from "react";
import type { GearItem, RigProfile } from "@/lib/types";
import { gear } from "@/lib/data/gear";
import { computeLoadout } from "@/lib/derive";
import { useTripPlan } from "@/lib/storage";
import { CountUp } from "@/components/garage/count-up";
import { PayloadBar } from "@/components/garage/payload-bar";
import {
  GEAR_CATEGORY_META,
  GEAR_CATEGORY_ORDER,
  PAYLOAD_WARN_PCT,
} from "@/components/garage/gear-meta";
import { IconAlert, IconCheck, IconX } from "@/components/garage/icons";

const MIN_PARTY = 1;
const MAX_PARTY = 6;

function GearRow({
  item,
  on,
  partySize,
  onToggle,
}: {
  item: GearItem;
  on: boolean;
  partySize: number;
  onToggle: () => void;
}) {
  const qty = item.qtyPerPerson ? partySize : 1;
  const lbs = Math.round(item.weightLbs * qty * 10) / 10;
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={on}
        className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors duration-150 ease-out hover:bg-gunmetal-light/50 ${
          on ? "bg-gunmetal-light/30" : ""
        }`}
      >
        {/* checkbox with spring tick */}
        <span
          aria-hidden
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border transition-colors duration-150 ease-out ${
            on ? "border-ember bg-ember text-basalt-deep" : "border-edge-strong"
          }`}
        >
          <IconCheck
            size={11}
            className={`transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
              on ? "scale-100" : "scale-0"
            }`}
          />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span
              className={`truncate text-sm ${on ? "text-bone" : "text-sand"}`}
            >
              {item.name}
            </span>
            {item.essential ? (
              <span
                className="rounded border border-edge px-1 font-display text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-sand-dim"
                title="Essential item"
              >
                Ess
              </span>
            ) : null}
          </span>
          {item.note ? (
            <span className="mt-0.5 block truncate text-[11px] text-sand-dim">
              {item.note}
            </span>
          ) : null}
        </span>

        <span className="shrink-0 text-right">
          <span className={`readout block text-xs ${on ? "" : "!text-sand-dim"}`}>
            {lbs.toLocaleString("en-US", { maximumFractionDigits: 1 })} lb
          </span>
          {item.qtyPerPerson ? (
            <span className="readout block text-[10px] text-sand-dim">
              {item.weightLbs} × {partySize}
            </span>
          ) : null}
        </span>
      </button>
    </li>
  );
}

/**
 * Loadout builder: toggle weighted gear onto the build and watch the stacked
 * weight-budget bar consume payload. Selection persists app-wide via the
 * shared rig hook; party size scales per-person items.
 */
export function LoadoutBuilder({
  rig,
  gearIds,
  onGearIds,
}: {
  rig: RigProfile;
  gearIds: string[];
  onGearIds: (next: string[]) => void;
}) {
  const { plan } = useTripPlan();
  // Party size follows the saved trip plan until the user steps it here.
  const [partyOverride, setPartyOverride] = useState<number | null>(null);
  const partySize =
    partyOverride ??
    Math.min(MAX_PARTY, Math.max(MIN_PARTY, plan?.partySize ?? 2));

  const selected = useMemo(() => new Set(gearIds), [gearIds]);
  const loadout = useMemo(
    () => computeLoadout(gearIds, partySize, rig, gear),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gearIds, partySize, rig.payloadLbs, rig.fuelRangeMiles],
  );

  const remaining = Math.round((rig.payloadLbs - loadout.totalLbs) * 10) / 10;
  const rangeDelta = rig.fuelRangeMiles - loadout.loadedFuelRangeMiles;
  const state =
    loadout.pctOfPayload > 100
      ? "over"
      : loadout.pctOfPayload >= PAYLOAD_WARN_PCT
        ? "warn"
        : "ok";

  const toggle = (id: string) => {
    onGearIds(
      selected.has(id) ? gearIds.filter((g) => g !== id) : [...gearIds, id],
    );
  };
  const packEssentials = () => {
    const union = new Set(gearIds);
    for (const item of gear) if (item.essential) union.add(item.id);
    onGearIds([...union]);
  };

  const stepParty = (delta: number) =>
    setPartyOverride(
      Math.min(MAX_PARTY, Math.max(MIN_PARTY, partySize + delta)),
    );

  return (
    <div>
      {/* toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="stat-label">Party size</span>
          <span className="card-surface inline-flex items-center">
            <button
              type="button"
              onClick={() => stepParty(-1)}
              disabled={partySize <= MIN_PARTY}
              aria-label="Decrease party size"
              className="px-3 py-1.5 text-sand transition-colors duration-150 hover:text-bone disabled:opacity-30"
            >
              −
            </button>
            <span className="readout min-w-8 text-center text-sm">
              {partySize}
            </span>
            <button
              type="button"
              onClick={() => stepParty(1)}
              disabled={partySize >= MAX_PARTY}
              aria-label="Increase party size"
              className="px-3 py-1.5 text-sand transition-colors duration-150 hover:text-bone disabled:opacity-30"
            >
              +
            </button>
          </span>
          <span className="hidden text-xs text-sand-dim sm:block">
            scales per-person gear
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={packEssentials}
            className="rounded border border-edge-strong px-2.5 py-1.5 font-display text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-sand transition-colors duration-150 ease-out hover:border-ember hover:text-ember-bright"
          >
            Pack essentials
          </button>
          <button
            type="button"
            onClick={() => onGearIds([])}
            disabled={gearIds.length === 0}
            className="rounded border border-edge px-2.5 py-1.5 font-display text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-sand-dim transition-colors duration-150 ease-out hover:border-edge-strong hover:text-sand disabled:opacity-30"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* gear catalog, grouped by category */}
        <div className="grid content-start gap-4 md:grid-cols-2">
          {GEAR_CATEGORY_ORDER.map((cat) => {
            const items = gear.filter((g) => g.category === cat);
            const picked = items.filter((g) => selected.has(g.id)).length;
            const catLbs = loadout.byCategory[cat] ?? 0;
            return (
              <section key={cat} className="card-surface overflow-hidden">
                <header className="flex items-center justify-between gap-3 border-b border-edge bg-basalt-deep/40 px-3 py-2">
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 rounded-[2px]"
                      style={{ backgroundColor: GEAR_CATEGORY_META[cat].color }}
                    />
                    <h3 className="font-display text-sm font-semibold uppercase tracking-[0.1em] text-bone">
                      {GEAR_CATEGORY_META[cat].label}
                    </h3>
                    <span className="readout text-[10px] text-sand-dim">
                      {picked}/{items.length}
                    </span>
                  </span>
                  <span className="readout text-[11px] text-sand-dim">
                    {catLbs.toLocaleString("en-US", { maximumFractionDigits: 1 })}{" "}
                    lb
                  </span>
                </header>
                <ul className="divide-y divide-edge/60">
                  {items.map((item) => (
                    <GearRow
                      key={item.id}
                      item={item}
                      on={selected.has(item.id)}
                      partySize={partySize}
                      onToggle={() => toggle(item.id)}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        {/* weight budget: sticky instrument panel */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="card-surface p-4 sm:p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="heading-display text-xl">Weight budget</h3>
              <p className="readout text-[11px] text-sand-dim">
                {gearIds.length} ITEMS
              </p>
            </div>

            <div className="mt-4">
              <PayloadBar
                byCategory={loadout.byCategory}
                totalLbs={loadout.totalLbs}
                payloadLbs={rig.payloadLbs}
              />
            </div>

            {/* status line: icon + label, never color alone */}
            <p
              className={`mt-4 flex items-center gap-2 rounded border px-3 py-2 text-xs ${
                state === "over"
                  ? "border-rust/60 bg-rust/15 text-rust-bright"
                  : state === "warn"
                    ? "border-amber/50 bg-amber/10 text-amber"
                    : "border-sage/40 bg-sage/10 text-sage-bright"
              }`}
            >
              {state === "over" ? (
                <>
                  <IconX size={13} className="shrink-0" />
                  Over payload by{" "}
                  {Math.abs(remaining).toLocaleString("en-US", {
                    maximumFractionDigits: 1,
                  })}{" "}
                  lb. Shed weight before the trailhead.
                </>
              ) : state === "warn" ? (
                <>
                  <IconAlert size={13} className="shrink-0" />
                  Past {PAYLOAD_WARN_PCT}% of payload. Watch the heavy items.
                </>
              ) : (
                <>
                  <IconCheck size={13} className="shrink-0" />
                  Within payload. Margin left for firewood and souvenirs.
                </>
              )}
            </p>

            {/* derived stats */}
            <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded border border-edge bg-edge">
              <div className="bg-gunmetal px-3 py-3">
                <dt className="stat-label !text-[0.6rem]">Total load</dt>
                <dd className="readout mt-1 text-xl">
                  <CountUp value={loadout.totalLbs} />
                  <span className="ml-1 text-xs text-sand-dim">lb</span>
                </dd>
              </div>
              <div className="bg-gunmetal px-3 py-3">
                <dt className="stat-label !text-[0.6rem]">Payload used</dt>
                <dd
                  className={`readout mt-1 text-xl ${
                    state === "over"
                      ? "text-rust-bright"
                      : state === "warn"
                        ? "text-amber"
                        : ""
                  }`}
                >
                  <CountUp value={loadout.pctOfPayload} decimals={1} />
                  <span className="ml-1 text-xs text-sand-dim">%</span>
                </dd>
              </div>
              <div className="bg-gunmetal px-3 py-3">
                <dt className="stat-label !text-[0.6rem]">
                  {remaining >= 0 ? "Remaining" : "Over by"}
                </dt>
                <dd
                  className={`readout mt-1 text-xl ${
                    remaining < 0 ? "text-rust-bright" : ""
                  }`}
                >
                  <CountUp value={Math.abs(remaining)} />
                  <span className="ml-1 text-xs text-sand-dim">lb</span>
                </dd>
              </div>
              <div className="bg-gunmetal px-3 py-3">
                <dt className="stat-label !text-[0.6rem]">Loaded fuel range</dt>
                <dd className="readout mt-1 text-xl">
                  <CountUp value={loadout.loadedFuelRangeMiles} />
                  <span className="ml-1 text-xs text-sand-dim">mi</span>
                </dd>
                {rangeDelta > 0 ? (
                  <p className="readout mt-0.5 text-[10px] text-sand-dim">
                    −{rangeDelta} mi vs rated
                  </p>
                ) : null}
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
