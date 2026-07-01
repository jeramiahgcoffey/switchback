"use client";

import {
  GEAR_CATEGORY_META,
  GEAR_CATEGORY_ORDER,
  PAYLOAD_WARN_PCT,
} from "@/components/garage/gear-meta";

/**
 * Animated stacked weight-budget bar. Per-category segments (fixed,
 * CVD-validated hue order, 2px surface gaps) fill a payload track with an
 * amber 85% tick and a GVWR limit marker; load past the limit renders as a
 * rust hatch. The scale stretches when overloaded so nothing clips.
 */
export function PayloadBar({
  byCategory,
  totalLbs,
  payloadLbs,
}: {
  byCategory: Record<string, number>;
  totalLbs: number;
  payloadLbs: number;
}) {
  const over = totalLbs > payloadLbs;
  const scaleMax = Math.max(totalLbs, payloadLbs);
  const limitPct = scaleMax > 0 ? (payloadLbs / scaleMax) * 100 : 100;
  const warnPct = limitPct * (PAYLOAD_WARN_PCT / 100);
  const pctOfPayload = payloadLbs > 0 ? (totalLbs / payloadLbs) * 100 : 0;

  const segments = GEAR_CATEGORY_ORDER.map((cat) => ({
    cat,
    lbs: byCategory[cat] ?? 0,
  }));

  return (
    <div>
      {/* 85% caution tick label (above the bar) */}
      <div aria-hidden className="relative h-4">
        <span
          className="readout absolute -translate-x-1/2 text-[10px] text-amber transition-[left] duration-300 ease-out"
          style={{ left: `${warnPct}%` }}
        >
          85%
        </span>
      </div>

      <div
        className="relative"
        role="img"
        aria-label={`Loadout ${totalLbs.toLocaleString("en-US")} of ${payloadLbs.toLocaleString(
          "en-US",
        )} lb payload — ${Math.round(pctOfPayload)}%${over ? ", over the limit" : ""}`}
      >
        {/* track */}
        <div
          className={`relative h-5 overflow-hidden rounded bg-gunmetal-light ${
            over ? "shadow-[0_0_0_1px_var(--color-rust)]" : ""
          }`}
        >
          <div className="flex h-full">
            {segments.map(({ cat, lbs }) => (
              <div
                key={cat}
                title={`${GEAR_CATEGORY_META[cat].label} — ${lbs.toLocaleString("en-US")} lb`}
                className="h-full shrink-0 transition-[width] duration-500 ease-out"
                style={{
                  width: `${scaleMax > 0 ? (lbs / scaleMax) * 100 : 0}%`,
                  backgroundColor: GEAR_CATEGORY_META[cat].color,
                  // 2px surface gap between touching segments — an inset
                  // shadow (not a border) so zero-width segments show nothing
                  // and width animations stay smooth.
                  boxShadow: "inset -2px 0 0 var(--color-gunmetal-light)",
                }}
              />
            ))}
          </div>

          {/* rust hatch over the portion past the GVWR limit */}
          {over ? (
            <div
              aria-hidden
              className="absolute inset-y-0 right-0 transition-[width] duration-500 ease-out"
              style={{
                width: `${100 - limitPct}%`,
                backgroundImage:
                  "repeating-linear-gradient(135deg, rgba(179,64,44,0.65) 0 5px, rgba(21,24,28,0.35) 5px 10px)",
              }}
            />
          ) : null}
        </div>

        {/* 85% caution tick */}
        <span
          aria-hidden
          className="absolute -top-1 bottom-[-4px] w-[2px] -translate-x-1/2 bg-amber/80 transition-[left] duration-300 ease-out"
          style={{ left: `${warnPct}%` }}
        />
        {/* GVWR limit marker */}
        <span
          aria-hidden
          className={`absolute -top-1 bottom-[-4px] w-[2px] -translate-x-1/2 transition-[left] duration-300 ease-out ${
            over ? "bg-rust-bright" : "bg-bone/80"
          }`}
          style={{ left: `${limitPct}%` }}
        />
      </div>

      {/* scale labels */}
      <div aria-hidden className="relative mt-1.5 h-4">
        <span className="readout absolute left-0 text-[10px] text-sand-dim">0</span>
        <span
          className={`readout absolute -translate-x-full whitespace-nowrap text-[10px] transition-[left] duration-300 ease-out ${
            over ? "text-rust-bright" : "text-sand-dim"
          }`}
          style={{ left: `${limitPct}%` }}
        >
          GVWR {payloadLbs.toLocaleString("en-US")} lb
        </span>
      </div>

      {/* legend — identity never rides on color alone */}
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
        {segments.map(({ cat, lbs }) => (
          <li
            key={cat}
            className={`flex items-center justify-between gap-2 ${
              lbs === 0 ? "opacity-40" : ""
            }`}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: GEAR_CATEGORY_META[cat].color }}
              />
              <span className="truncate text-xs text-sand">
                {GEAR_CATEGORY_META[cat].label}
              </span>
            </span>
            <span className="readout text-[11px] text-sand-dim">
              {lbs.toLocaleString("en-US", { maximumFractionDigits: 1 })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
