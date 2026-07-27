"use client";

import { useState } from "react";
import { MAX_RIG_BUILDS, resolveRigState } from "@/lib/rig-library";
import type { RigBuild } from "@/lib/types";
import { Button } from "@/components/ui/button";

interface SavedRigsBarProps {
  rigs: RigBuild[];
  activeRigId: string;
  onCreate: () => void;
  onDuplicate: (id: string) => void;
  onActivate: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

function RigRow({
  build,
  isActive,
  canDelete,
  canDuplicate,
  onDuplicate,
  onActivate,
  onRename,
  onDelete,
}: {
  build: RigBuild;
  isActive: boolean;
  canDelete: boolean;
  canDuplicate: boolean;
  onDuplicate: (id: string) => void;
  onActivate: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const profile = resolveRigState(build.rig);

  function startRename() {
    setDraftName(build.name);
    setEditing(true);
  }

  function commitRename() {
    const name = draftName.trim();
    if (name) onRename(build.id, name);
    setEditing(false);
  }

  return (
    <li
      className={`rounded border p-3 transition-colors ${
        isActive
          ? "border-ember/60 bg-ember/5"
          : "border-edge bg-basalt/40 hover:border-edge-strong"
      }`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-48 flex-1">
          {editing ? (
            <input
              autoFocus
              value={draftName}
              maxLength={256}
              onChange={(event) => setDraftName(event.target.value)}
              onBlur={commitRename}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitRename();
                if (event.key === "Escape") setEditing(false);
              }}
              className="w-full rounded border border-edge-strong bg-basalt-deep px-2 py-1 text-sm text-bone outline-none focus:border-ember"
              aria-label="Rig name"
            />
          ) : (
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-bone">
                {build.name}
              </span>
              {isActive ? (
                <span className="shrink-0 rounded-sm bg-ember/15 px-1.5 py-0.5 font-display text-[10px] uppercase tracking-[0.12em] text-ember-bright">
                  Active
                </span>
              ) : null}
            </div>
          )}
          {!editing ? (
            <p className="mt-0.5 truncate text-xs text-sand-dim">
              {profile.vehicle} · {profile.tireIn}&quot; tires ·{" "}
              {build.rig.gearIds.length} gear item
              {build.rig.gearIds.length === 1 ? "" : "s"}
            </p>
          ) : null}
        </div>

        {confirmingDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-sand-dim">Remove?</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                onDelete(build.id);
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
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onActivate(build.id)}
              disabled={isActive}
              className="disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isActive ? "Loaded" : "Load"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={startRename}
            >
              Rename
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDuplicate(build.id)}
              disabled={!canDuplicate}
              className="disabled:cursor-not-allowed disabled:opacity-40"
            >
              Duplicate
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmingDelete(true)}
              disabled={!canDelete}
              className="disabled:cursor-not-allowed disabled:opacity-40"
            >
              Remove
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}

export function SavedRigsBar({
  rigs,
  activeRigId,
  onCreate,
  onDuplicate,
  onActivate,
  onRename,
  onDelete,
}: SavedRigsBarProps) {
  const atLimit = rigs.length >= MAX_RIG_BUILDS;

  return (
    <section
      aria-label="Saved rigs"
      className="rounded-lg border border-edge bg-gunmetal/40 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="stat-label">Garage library</p>
          <p className="mt-1 text-xs text-sand-dim">
            {rigs.length} named build{rigs.length === 1 ? "" : "s"} ·{" "}
            {MAX_RIG_BUILDS} maximum
          </p>
        </div>
        <Button
          size="sm"
          variant="primary"
          onClick={onCreate}
          disabled={atLimit}
          className="disabled:cursor-not-allowed disabled:opacity-40"
          title={atLimit ? "Garage library is full" : undefined}
        >
          New rig
        </Button>
      </div>

      <ul className="mt-4 space-y-2">
        {rigs.map((build) => (
          <RigRow
            key={build.id}
            build={build}
            isActive={build.id === activeRigId}
            canDelete={rigs.length > 1}
            canDuplicate={!atLimit}
            onDuplicate={onDuplicate}
            onActivate={onActivate}
            onRename={onRename}
            onDelete={onDelete}
          />
        ))}
      </ul>
    </section>
  );
}
