"use client";

/**
 * Equipment rocker switch for boolean specs (winch, lockers, 4-lo),
 * instrument-panel style: label left, switch + mono status readout right.
 */
export function SpecToggle({
  label,
  on,
  onChange,
  stockOn,
}: {
  label: string;
  on: boolean;
  onChange: (next: boolean) => void;
  /** Preset value. Shows a modified marker when edited away from stock. */
  stockOn?: boolean;
}) {
  const modified = stockOn !== undefined && on !== stockOn;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="group flex w-full items-center justify-between gap-3 rounded border border-edge bg-basalt-deep/40 px-3 py-2.5 text-left transition-colors duration-150 ease-out hover:border-edge-strong"
    >
      <span className="stat-label !text-sand">
        {label}
        {modified ? (
          <span
            className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-ember align-middle"
            title="Edited from stock"
          />
        ) : null}
      </span>
      <span className="flex items-center gap-2.5">
        <span
          className={`readout text-[10px] ${on ? "text-ember-bright" : "text-sand-dim"}`}
        >
          {on ? "EQUIPPED" : "NOT FITTED"}
        </span>
        <span
          aria-hidden
          className={`relative inline-flex h-5 w-10 shrink-0 items-center rounded-full border transition-colors duration-150 ease-out ${
            on ? "border-ember bg-ember/25" : "border-edge-strong bg-basalt-deep"
          }`}
        >
          <span
            className={`absolute h-3.5 w-3.5 rounded-full transition-[left,background-color] duration-200 ease-out ${
              on ? "left-[22px] bg-ember" : "left-[3px] bg-sand-dim"
            }`}
          />
        </span>
      </span>
    </button>
  );
}
