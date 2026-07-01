"use client";

import { useId } from "react";

/**
 * Editable instrument gauge: a tick-marked horizontal scale with an ember
 * fill and a bone "needle" thumb, driven by a real <input type="range"> so
 * keyboard and screen-reader behavior come for free.
 */
export function TickGauge({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  stockValue,
  ticks = 25,
  majorEvery = 4,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  /** Readout formatter, e.g. (v) => `${v}"` */
  format: (v: number) => string;
  /** Preset value — a small ember delta marker appears when edited away from stock. */
  stockValue?: number;
  /** Total tick marks along the scale (including both ends). */
  ticks?: number;
  majorEvery?: number;
}) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  const modified = stockValue !== undefined && value !== stockValue;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="stat-label">
          {label}
        </label>
        <p className="readout text-sm">
          {modified ? (
            <span className="mr-2 text-xs text-sand-dim line-through">
              {format(stockValue)}
            </span>
          ) : null}
          <span className={modified ? "text-ember-bright" : undefined}>
            {format(value)}
          </span>
        </p>
      </div>

      <div className="relative mt-1.5 h-10">
        {/* scale track + fill (visual layer) */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-basalt-deep"
        >
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-ember transition-[width] duration-200 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* tick marks */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between"
        >
          {Array.from({ length: ticks }).map((_, i) => (
            <span
              key={i}
              className={
                i % majorEvery === 0
                  ? "h-2.5 w-px bg-edge-strong"
                  : "h-1.5 w-px bg-edge"
              }
            />
          ))}
        </div>

        {/* the real control, drawn as a needle over the scale */}
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-valuetext={format(value)}
          className="absolute inset-0 h-full w-full cursor-ew-resize appearance-none bg-transparent
            [&::-webkit-slider-runnable-track]:h-full [&::-webkit-slider-runnable-track]:bg-transparent
            [&::-webkit-slider-thumb]:h-[22px] [&::-webkit-slider-thumb]:w-[10px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-[3px] [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-basalt-deep [&::-webkit-slider-thumb]:bg-bone [&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgba(0,0,0,0.5)]
            [&::-moz-range-track]:bg-transparent
            [&::-moz-range-thumb]:h-[22px] [&::-moz-range-thumb]:w-[10px] [&::-moz-range-thumb]:rounded-[3px] [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-basalt-deep [&::-moz-range-thumb]:bg-bone"
        />
      </div>

      <div aria-hidden className="mt-1 flex justify-between">
        <span className="readout text-[10px] text-sand-dim">{format(min)}</span>
        <span className="readout text-[10px] text-sand-dim">{format(max)}</span>
      </div>
    </div>
  );
}
