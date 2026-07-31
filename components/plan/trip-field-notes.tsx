"use client";

import type { TripFieldNotes as TripFieldNotesValue } from "@/lib/types";

const inputClass =
  "mt-1.5 w-full rounded border border-edge-strong bg-basalt-deep px-3 py-2 text-sm text-bone outline-none placeholder:text-sand-dim/60 focus:border-ember";

export function TripFieldNotes({
  value,
  onChange,
}: {
  value?: TripFieldNotesValue;
  onChange: (value: TripFieldNotesValue) => void;
}) {
  const notes = value ?? {};

  function update(key: keyof TripFieldNotesValue, next: string) {
    onChange({ ...notes, [key]: next });
  }

  return (
    <section aria-labelledby="field-notes-heading" className="card-surface p-4 sm:p-5">
      <div className="max-w-2xl">
        <p className="stat-label">Field details</p>
        <h2 id="field-notes-heading" className="heading-display mt-1 text-xl">
          Leave a recovery trail
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-sand-dim">
          These details travel with the saved trip packet. Add the person who
          should raise the alarm and the time they should expect to hear from
          your crew.
        </p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-medium text-sand">
          Trip leader
          <input
            className={inputClass}
            value={notes.tripLeader ?? ""}
            maxLength={256}
            autoComplete="name"
            placeholder="Name or call sign"
            onChange={(event) => update("tripLeader", event.target.value)}
          />
        </label>
        <label className="text-xs font-medium text-sand">
          Check-in deadline
          <input
            className={inputClass}
            type="datetime-local"
            value={notes.checkInBy ?? ""}
            onChange={(event) => update("checkInBy", event.target.value)}
          />
        </label>
        <label className="text-xs font-medium text-sand">
          Emergency contact
          <input
            className={inputClass}
            value={notes.emergencyContact ?? ""}
            maxLength={256}
            autoComplete="name"
            placeholder="Someone staying off trail"
            onChange={(event) => update("emergencyContact", event.target.value)}
          />
        </label>
        <label className="text-xs font-medium text-sand">
          Emergency phone
          <input
            className={inputClass}
            type="tel"
            value={notes.emergencyPhone ?? ""}
            maxLength={256}
            autoComplete="tel"
            placeholder="Mobile or satellite number"
            onChange={(event) => update("emergencyPhone", event.target.value)}
          />
        </label>
      </div>

      <label className="mt-4 block text-xs font-medium text-sand">
        Crew, permit, medical, meetup, and weather notes
        <textarea
          className={`${inputClass} min-h-28 resize-y leading-relaxed`}
          value={notes.notes ?? ""}
          maxLength={2000}
          placeholder="Vehicle roster, permit numbers, allergies, meetup coordinates, alternate exits…"
          onChange={(event) => update("notes", event.target.value)}
        />
      </label>
      <p className="mt-2 text-right font-mono text-[0.65rem] text-sand-dim">
        {(notes.notes ?? "").length} / 2000
      </p>
    </section>
  );
}
