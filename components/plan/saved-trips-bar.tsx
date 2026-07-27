"use client";

/**
 * The saved-trip library: the multi-trip surface above the wizard. Lists every
 * saved TripPlan with load / rename / remove, and a "Save this trip" action
 * that snapshots the current working plan into the library.
 *
 * Purely presentational — all persistence lives in `useSavedTrips` (localStorage
 * + account sync); this component just renders and raises intent.
 */

import { useState } from "react";
import { getTrailBySlug } from "@/lib/data/trails";
import type { TripPlan } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { SaveTickIcon } from "./plan-icons";
import { tripLabel } from "./wizard-shared";

interface SavedTripsBarProps {
  trips: TripPlan[];
  activePlanId: string | null;
  /** Whether there's a working plan that can be saved. */
  canSaveCurrent: boolean;
  /** Whether the working plan is already in the library (drives button copy). */
  currentIsSaved: boolean;
  onSaveCurrent: () => void;
  onLoad: (trip: TripPlan) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

function IconSvg({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={label}
    >
      {children}
    </svg>
  );
}

const PencilIcon = () => (
  <IconSvg label="Rename">
    <path d="M14.5 5.5l4 4M4 20l4.5-1 10-10a1.8 1.8 0 0 0 0-2.5l-1-1a1.8 1.8 0 0 0-2.5 0l-10 10L4 20Z" />
  </IconSvg>
);
const TrashIcon = () => (
  <IconSvg label="Remove">
    <path d="M4 6.5h16M9 6.5V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v1.5M6.5 6.5 7.3 19a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12.5" />
  </IconSvg>
);

function TripMeta({ plan }: { plan: TripPlan }) {
  const trail = getTrailBySlug(plan.trailSlug);
  const days = plan.days.length;
  const parts = [
    trail?.region,
    `${days} day${days === 1 ? "" : "s"}`,
    trail ? `Difficulty ${trail.difficulty}` : null,
  ].filter(Boolean);
  return (
    <p className="mt-0.5 truncate text-xs text-sand-dim">{parts.join("  ·  ")}</p>
  );
}

function TripRow({
  trip,
  isActive,
  onLoad,
  onDelete,
  onRename,
}: {
  trip: TripPlan;
  isActive: boolean;
  onLoad: (trip: TripPlan) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function startRename() {
    setDraftName(tripLabel(trip));
    setEditing(true);
  }
  function commitRename() {
    const name = draftName.trim();
    if (name) onRename(trip.id, name);
    setEditing(false);
  }

  return (
    <li
      className={`flex items-center gap-3 rounded border px-3 py-2.5 transition-colors ${
        isActive
          ? "border-ember/60 bg-ember/5"
          : "border-edge bg-basalt/40 hover:border-edge-strong"
      }`}
    >
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") setEditing(false);
            }}
            className="w-full rounded border border-edge-strong bg-basalt-deep px-2 py-1 text-sm text-bone outline-none focus:border-ember"
            aria-label="Trip name"
          />
        ) : (
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-bone">
              {tripLabel(trip)}
            </span>
            {isActive && (
              <span className="shrink-0 rounded-sm bg-ember/15 px-1.5 py-0.5 font-display text-[10px] uppercase tracking-[0.12em] text-ember-bright">
                Active
              </span>
            )}
          </div>
        )}
        {!editing && <TripMeta plan={trip} />}
      </div>

      {confirmingDelete ? (
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-sand-dim">Remove?</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              onDelete(trip.id);
              setConfirmingDelete(false);
            }}
          >
            Yes
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setConfirmingDelete(false)}
          >
            No
          </Button>
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onLoad(trip)}
            disabled={isActive}
            className="disabled:cursor-not-allowed disabled:opacity-40"
            title={isActive ? "Already loaded in the builder" : "Load in the builder"}
          >
            {isActive ? "Loaded" : "Load"}
          </Button>
          <button
            type="button"
            onClick={startRename}
            className="rounded p-1.5 text-sand hover:bg-basalt-deep hover:text-bone"
            aria-label={`Rename ${tripLabel(trip)}`}
          >
            <PencilIcon />
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="rounded p-1.5 text-sand hover:bg-basalt-deep hover:text-ember-bright"
            aria-label={`Remove ${tripLabel(trip)}`}
          >
            <TrashIcon />
          </button>
        </div>
      )}
    </li>
  );
}

export function SavedTripsBar({
  trips,
  activePlanId,
  canSaveCurrent,
  currentIsSaved,
  onSaveCurrent,
  onLoad,
  onDelete,
  onRename,
}: SavedTripsBarProps) {
  const sorted = [...trips].sort((a, b) =>
    (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
  );

  return (
    <section
      aria-label="Saved trips"
      className="mx-auto max-w-2xl rounded-lg border border-edge bg-gunmetal/40 p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="stat-label">Saved trips</p>
          <p className="mt-1 text-xs text-sand-dim">
            {trips.length === 0
              ? "Save the current build to start your library."
              : `${trips.length} trip${trips.length === 1 ? "" : "s"} in your library.`}
          </p>
        </div>
        {canSaveCurrent && (
          <Button size="sm" variant="primary" onClick={onSaveCurrent}>
            <SaveTickIcon size={14} />
            {currentIsSaved ? "Update saved" : "Save this trip"}
          </Button>
        )}
      </div>

      {sorted.length > 0 && (
        <ul className="mt-4 space-y-2">
          {sorted.map((trip) => (
            <TripRow
              key={trip.id}
              trip={trip}
              isActive={trip.id === activePlanId}
              onLoad={onLoad}
              onDelete={onDelete}
              onRename={onRename}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
