"use client";

/**
 * Three-stop wizard rail: diamond step markers joined by dashed "route"
 * connectors, echoing the trail-map language. Completed steps are
 * clickable to jump back.
 */
import type { WizardStep } from "./wizard-shared";

const STEPS: { step: WizardStep; label: string; caption: string }[] = [
  { step: 1, label: "Route & Crew", caption: "Trail, date, rig" },
  { step: 2, label: "Itinerary", caption: "Days & fuel" },
  { step: 3, label: "Pack List", caption: "Condition-aware" },
];

export function StepIndicator({
  current,
  maxReachable,
  onSelect,
}: {
  current: WizardStep;
  maxReachable: WizardStep;
  onSelect: (step: WizardStep) => void;
}) {
  return (
    <ol className="flex items-start" aria-label="Wizard progress">
      {STEPS.map(({ step, label, caption }, i) => {
        const done = step < current;
        const active = step === current;
        const reachable = step <= maxReachable;
        return (
          <li
            key={step}
            className={`flex items-start ${i > 0 ? "flex-1" : ""} min-w-0`}
          >
            {i > 0 && (
              <div
                aria-hidden
                className={`mx-2 mt-4 h-0 flex-1 border-t-2 border-dashed sm:mx-4 ${
                  step <= current ? "border-ember/60" : "border-edge-strong"
                }`}
              />
            )}
            <button
              type="button"
              disabled={!reachable}
              onClick={() => reachable && onSelect(step)}
              aria-current={active ? "step" : undefined}
              className={`group flex flex-col items-center gap-2 ${
                reachable && !active ? "cursor-pointer" : ""
              } disabled:cursor-default`}
            >
              <span
                aria-hidden
                className={`flex h-8 w-8 rotate-45 items-center justify-center rounded-[3px] border transition-colors duration-150 ease-out ${
                  active
                    ? "border-ember bg-ember/15"
                    : done
                      ? "border-ember bg-ember"
                      : "border-edge-strong bg-gunmetal group-hover:border-ember/50"
                }`}
              >
                <span
                  className={`-rotate-45 font-mono text-xs font-semibold ${
                    active
                      ? "text-ember-bright"
                      : done
                        ? "text-basalt-deep"
                        : "text-sand-dim"
                  }`}
                >
                  {done ? "✓" : `0${step}`}
                </span>
              </span>
              <span className="flex flex-col items-center">
                <span className={`stat-label ${active ? "text-bone" : ""}`}>
                  {label}
                </span>
                <span className="hidden text-[0.7rem] text-sand-dim sm:block">
                  {caption}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
