"use client";

/**
 * Step 2: Itinerary. splitIntoDays() segments the route on campsite
 * waypoints; each day card reads out mileage, estimated wheel hours, camp,
 * and resupply flags. buildFuelCheck() drives the fuel-range warning
 * banner and per-leg no-fuel chips. Hovering a day highlights its
 * polyline segment on the map.
 */
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { SPEED_BY_DIFFICULTY, type FuelCheck } from "@/lib/derive";
import type { DayPlan, RigProfile, Trail, Waypoint } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { AlertIcon, DropIcon, FlagIcon, FuelIcon, TentIcon } from "./plan-icons";
import { formatTripDate, formatWheelHours } from "./wizard-shared";
import { useCountUp } from "./use-count-up";
import styles from "./plan.module.css";

const ItineraryMap = dynamic(() => import("./itinerary-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-basalt-deep">
      <span className="stat-label animate-pulse">Loading map…</span>
    </div>
  ),
});

function Stat({
  label,
  value,
  unit,
  decimals = 0,
}: {
  label: string;
  value: number;
  unit: string;
  decimals?: number;
}) {
  const display = useCountUp(value, 650);
  return (
    <div className="flex flex-col gap-1 px-4 py-3 sm:px-5">
      <span className="stat-label">{label}</span>
      <span className="readout text-xl sm:text-2xl">
        {display.toLocaleString("en-US", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })}
        <span className="ml-1 text-xs text-sand-dim">{unit}</span>
      </span>
    </div>
  );
}

function DayCard({
  day,
  trail,
  startDate,
  maxDayMiles,
  fuelLegGap,
  legExceeds,
  active,
  onActive,
  onInactive,
}: {
  day: DayPlan;
  trail: Trail;
  startDate: string;
  maxDayMiles: number;
  fuelLegGap: number;
  legExceeds: boolean;
  active: boolean;
  onActive: () => void;
  onInactive: () => void;
}) {
  const byId = (id: string): Waypoint | undefined =>
    trail.waypoints.find((w) => w.id === id);
  const start = byId(day.startWaypointId);
  const end = byId(day.endWaypointId);
  const camp = day.campWaypointId ? byId(day.campWaypointId) : null;
  const resupply = day.resupplyWaypointIds
    .map(byId)
    .filter((w): w is Waypoint => Boolean(w));

  return (
    <li
      className={`card-surface hover-lift p-4 transition-colors sm:p-5 ${
        active ? "border-ember/70" : ""
      }`}
      onMouseEnter={onActive}
      onMouseLeave={onInactive}
      onFocus={onActive}
      onBlur={onInactive}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <span className="heading-display text-lg text-ember-bright">
            Day {String(day.day).padStart(2, "0")}
          </span>
          <span className="text-xs text-sand-dim">
            {formatTripDate(startDate, day.day - 1)}
          </span>
        </div>
        <div className="readout flex gap-4 text-sm">
          <span>
            {day.miles.toLocaleString("en-US", { maximumFractionDigits: 1 })}
            <span className="ml-1 text-[0.65rem] text-sand-dim">MI</span>
          </span>
          <span>
            {formatWheelHours(day.estWheelHours).replace(" hr", "")}
            <span className="ml-1 text-[0.65rem] text-sand-dim">HR</span>
          </span>
        </div>
      </div>

      {/* Relative-mileage gauge */}
      <div
        aria-hidden
        className="mt-3 h-1 overflow-hidden rounded-full bg-basalt-deep"
      >
        <div
          className={`${styles.gaugeFill} h-full rounded-full ${
            active ? "bg-ember-bright" : "bg-ember"
          }`}
          style={{
            width: `${maxDayMiles > 0 ? Math.max(4, (day.miles / maxDayMiles) * 100) : 0}%`,
          }}
        />
      </div>

      <p className="mt-3 flex min-w-0 items-center gap-2 text-sm text-sand">
        <FlagIcon size={14} className="shrink-0 text-sand-dim" />
        <span className="truncate">{start?.name ?? "Start"}</span>
        <span aria-hidden className="shrink-0 text-ember">
          →
        </span>
        <span className="truncate text-bone">{end?.name ?? "End"}</span>
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {camp ? (
          <Badge tone="sage">
            <TentIcon size={12} />
            Camp · {camp.name}
          </Badge>
        ) : (
          <Badge tone="sand">
            <FlagIcon size={12} />
            Off trail, trip complete
          </Badge>
        )}
        {resupply.map((w) => (
          <Badge key={w.id} tone={w.kind === "fuel" ? "amber" : "neutral"}>
            {w.kind === "fuel" ? <FuelIcon size={12} /> : <DropIcon size={12} />}
            {w.kind === "fuel" ? "Fuel" : "Water"} · {w.name}
          </Badge>
        ))}
        {legExceeds && (
          <Badge tone="rust">
            <AlertIcon size={12} />
            {fuelLegGap.toLocaleString("en-US", { maximumFractionDigits: 0 })} mi
            no-fuel stretch
          </Badge>
        )}
      </div>
    </li>
  );
}

export function StepItinerary({
  trail,
  rig,
  days,
  fuel,
  startDate,
  targetDays,
  maxDays,
  onTargetDays,
}: {
  trail: Trail;
  rig: RigProfile;
  days: DayPlan[];
  fuel: FuelCheck;
  startDate: string;
  targetDays: number;
  maxDays: number;
  onTargetDays: (n: number) => void;
}) {
  const [hoverDay, setHoverDay] = useState<number | null>(null);

  const totals = useMemo(
    () => ({
      miles: days.reduce((s, d) => s + d.miles, 0),
      hours: days.reduce((s, d) => s + d.estWheelHours, 0),
      nights: days.filter((d) => d.campWaypointId).length,
    }),
    [days],
  );
  const maxDayMiles = Math.max(...days.map((d) => d.miles), 0);
  const badLegs = fuel.legs.filter((l) => l.exceedsRange);

  return (
    <div className="flex flex-col gap-6">
      {/* Header: split control + stat band */}
      <div className="card-surface flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="heading-display text-xl">{trail.name}</h2>
          <p className="mt-1 text-xs text-sand-dim">
            Anchored on campsite waypoints. Wheel hours assume ~
            {SPEED_BY_DIFFICULTY[trail.difficulty]} mph for difficulty{" "}
            {trail.difficulty} terrain.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <span id="split-days-label" className="stat-label">
              Split across
            </span>
            <div
              className="inline-flex items-center gap-1 rounded border border-edge-strong"
              role="group"
              aria-labelledby="split-days-label"
            >
              <button
                type="button"
                onClick={() => onTargetDays(Math.max(1, targetDays - 1))}
                disabled={targetDays <= 1}
                aria-label="Fewer days"
                className="px-3 py-1.5 font-mono text-base text-sand transition-colors duration-150 hover:text-ember-bright disabled:opacity-30"
              >
                −
              </button>
              <span className="readout w-8 text-center" aria-live="polite">
                {days.length}
              </span>
              <button
                type="button"
                onClick={() => onTargetDays(Math.min(maxDays, targetDays + 1))}
                disabled={targetDays >= maxDays}
                aria-label="More days"
                className="px-3 py-1.5 font-mono text-base text-sand transition-colors duration-150 hover:text-ember-bright disabled:opacity-30"
              >
                +
              </button>
            </div>
            <span className="stat-label">days</span>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-edge border-t border-edge sm:grid-cols-4 lg:border-l lg:border-t-0">
          <Stat label="Total miles" value={totals.miles} unit="MI" decimals={1} />
          <Stat label="Wheel hours" value={totals.hours} unit="HR" decimals={1} />
          <Stat label="Nights out" value={totals.nights} unit="×" />
          <Stat label="Worst fuel gap" value={fuel.worstGapMiles} unit="MI" />
        </div>
      </div>

      {/* Fuel-range warning banner */}
      {!fuel.ok && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-rust/60 bg-rust/15 p-4"
        >
          <AlertIcon size={20} className="mt-0.5 shrink-0 text-rust-bright" />
          <div className="text-sm leading-relaxed text-sand">
            <p className="heading-display text-base text-rust-bright">
              Fuel range warning
            </p>
            <p className="mt-1">
              {badLegs.length === 1 ? (
                <>
                  Day {badLegs[0].day} sits inside a{" "}
                  <span className="readout">{badLegs[0].gapMiles} mi</span>{" "}
                  stretch with no fuel
                </>
              ) : (
                <>
                  Days {badLegs.map((l) => l.day).join(", ")} sit inside
                  no-fuel stretches up to{" "}
                  <span className="readout">{fuel.worstGapMiles} mi</span>
                </>
              )},{" "}
              beyond the {rig.name}&apos;s effective off-road range of{" "}
              <span className="readout">~{fuel.effectiveRangeMiles} mi</span>{" "}
              ({rig.fuelRangeMiles} mi rated, derated for trail burn). Carry
              auxiliary fuel or pick a longer-range rig in step one.
            </p>
          </div>
        </div>
      )}
      {fuel.ok && (
        <div className="flex items-center gap-3 rounded-lg border border-sage/40 bg-sage/10 px-4 py-3">
          <FuelIcon size={18} className="shrink-0 text-sage-bright" />
          <p className="text-sm text-sand">
            Fuel checks out. Worst gap{" "}
            <span className="readout">{fuel.worstGapMiles} mi</span> vs an
            effective off-road range of{" "}
            <span className="readout">~{fuel.effectiveRangeMiles} mi</span> for
            the {rig.name}.
          </p>
        </div>
      )}

      {/* Timeline + map */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ol className="flex flex-col gap-3" aria-label="Day-by-day itinerary">
          {days.map((d) => {
            const leg = fuel.legs.find((l) => l.day === d.day);
            return (
              <DayCard
                key={d.day}
                day={d}
                trail={trail}
                startDate={startDate}
                maxDayMiles={maxDayMiles}
                fuelLegGap={leg?.gapMiles ?? 0}
                legExceeds={leg?.exceedsRange ?? false}
                active={hoverDay === d.day}
                onActive={() => setHoverDay(d.day)}
                onInactive={() => setHoverDay(null)}
              />
            );
          })}
        </ol>
        <div className="card-surface h-72 overflow-hidden sm:h-96 lg:sticky lg:top-20 lg:h-[calc(100vh-11rem)] lg:max-h-[560px]">
          <ItineraryMap
            key={trail.slug}
            trail={trail}
            days={days}
            activeDay={hoverDay}
          />
        </div>
      </div>
    </div>
  );
}
