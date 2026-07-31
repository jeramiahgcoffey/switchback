"use client";

import { useMemo } from "react";
import { useSavedTrips } from "@/lib/storage";
import {
  buildTripPacket,
  type TripPacketData,
  type TripPacketDay,
} from "@/lib/trip-packet";
import { formatCoords, formatFeet, formatMiles } from "@/lib/derive";
import type {
  CellCoverage,
  GearCategory,
  ReadinessStatus,
  Waypoint,
  WaypointKind,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  CATEGORY_LABEL,
  AlertIcon,
  DropIcon,
  FlagIcon,
  FuelIcon,
  TentIcon,
} from "./plan-icons";
import {
  formatFullDate,
  formatTripDate,
  formatWheelHours,
  tripLabel,
} from "./wizard-shared";
import styles from "./trip-packet.module.css";

const WAYPOINT_LABEL: Record<WaypointKind, string> = {
  trailhead: "Trailhead",
  campsite: "Camp",
  fuel: "Fuel",
  water: "Water",
  viewpoint: "Viewpoint",
  obstacle: "Obstacle",
  bailout: "Bailout",
  exit: "Exit",
};

const CELL_LABEL: Record<CellCoverage, string> = {
  none: "None",
  spotty: "Spotty",
  good: "Good",
};

const STATUS_LABEL: Record<ReadinessStatus, string> = {
  pass: "Ready",
  warn: "Review",
  fail: "Resolve",
};

function formatNumber(value: number, decimals = 0) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: decimals,
  });
}

function formatCheckIn(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatKind(kind: string) {
  return kind
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function PrintIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
      <path d="M7 14h10v7H7z" />
      <path d="M17.5 11.5h.01" />
    </svg>
  );
}

function PacketMark() {
  return (
    <svg
      className={styles.packetMark}
      width="44"
      height="44"
      viewBox="0 0 44 44"
      fill="none"
      aria-hidden
    >
      <rect x="1" y="1" width="42" height="42" rx="7" />
      <path d="M8 34h16a5 5 0 0 0 0-10H14a5 5 0 0 1 0-10h22" />
      <circle cx="8" cy="34" r="2.5" />
      <circle cx="36" cy="14" r="2.5" />
    </svg>
  );
}

function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number;
  unit?: string;
}) {
  return (
    <div className={styles.stat}>
      <dt>{label}</dt>
      <dd>
        {value}
        {unit ? <small>{unit}</small> : null}
      </dd>
    </div>
  );
}

function SectionHeading({
  number,
  eyebrow,
  title,
}: {
  number: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <header className={styles.sectionHeading}>
      <span>{number}</span>
      <div>
        <p>{eyebrow}</p>
        <h2>{title}</h2>
      </div>
    </header>
  );
}

function DayCard({
  day,
  startDate,
}: {
  day: TripPacketDay;
  startDate: string;
}) {
  const { plan } = day;
  return (
    <article className={styles.dayCard}>
      <div className={styles.dayMarker}>
        <span>Day</span>
        <strong>{String(plan.day).padStart(2, "0")}</strong>
      </div>
      <div className={styles.dayBody}>
        <div className={styles.dayHeader}>
          <div>
            <p>{formatTripDate(startDate, plan.day - 1)}</p>
            <h3>
              {day.start?.name ?? "Route start"}
              <span aria-hidden>→</span>
              {day.end?.name ?? "Route end"}
            </h3>
          </div>
          <div className={styles.dayReadout}>
            <strong>{formatNumber(plan.miles, 1)} mi</strong>
            <span>{formatWheelHours(plan.estWheelHours)}</span>
          </div>
        </div>

        <div className={styles.dayDetails}>
          <p>
            <TentIcon size={15} />
            <span>
              <small>Night stop</small>
              {day.camp?.name ?? "Off trail — trip complete"}
            </span>
          </p>
          <p>
            <FuelIcon size={15} />
            <span>
              <small>Fuel exposure</small>
              {formatNumber(day.fuelGapMiles, 1)} mi no-fuel stretch
              {day.exceedsRange ? " — exceeds range" : ""}
            </span>
          </p>
        </div>

        {day.resupply.length ? (
          <p className={styles.resupply}>
            Resupply:{" "}
            {day.resupply
              .map((waypoint) => `${WAYPOINT_LABEL[waypoint.kind]} · ${waypoint.name}`)
              .join(" / ")}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function WaypointGlyph({ waypoint }: { waypoint: Waypoint }) {
  if (waypoint.kind === "fuel") return <FuelIcon size={15} />;
  if (waypoint.kind === "water") return <DropIcon size={15} />;
  if (waypoint.kind === "campsite") return <TentIcon size={15} />;
  if (waypoint.kind === "obstacle" || waypoint.kind === "bailout") {
    return <AlertIcon size={15} />;
  }
  return <FlagIcon size={15} />;
}

function GearGroup({
  category,
  packet,
}: {
  category: GearCategory;
  packet: TripPacketData;
}) {
  const group = packet.gearGroups.find((entry) => entry.category === category);
  if (!group) return null;
  const packed = group.items.filter((entry) => entry.checked).length;

  return (
    <section className={styles.gearGroup}>
      <header>
        <h3>{CATEGORY_LABEL[category]}</h3>
        <span>
          {packed}/{group.items.length} packed
        </span>
      </header>
      <ul>
        {group.items.map(({ item, quantity, weightLbs, checked }) => (
          <li key={item.id}>
            <span
              className={`${styles.checkBox} ${checked ? styles.checkBoxDone : ""}`}
              aria-label={checked ? "Packed" : "Not packed"}
            >
              {checked ? "✓" : ""}
            </span>
            <span className={styles.gearName}>
              {item.name}
              {item.essential ? <small>Essential</small> : null}
            </span>
            <span className={styles.gearWeight}>
              {quantity > 1 ? `×${quantity} · ` : ""}
              {formatNumber(weightLbs, 1)} lb
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function EmptyPacket({ invalid = false }: { invalid?: boolean }) {
  return (
    <div className={styles.emptyState}>
      <p className="stat-label">Trip packet unavailable</p>
      <h1 className="heading-display">
        {invalid ? "This route is no longer in the catalog" : "Saved trip not found"}
      </h1>
      <p>
        {invalid
          ? "The trip is still saved, but its trail data cannot be resolved into a field packet."
          : "Trip packets live with your saved trips on this device or signed-in account. Open the Trip Builder and save a trip first."}
      </p>
      <Button href="/plan">Return to Trip Builder</Button>
    </div>
  );
}

function Packet({ packet }: { packet: TripPacketData }) {
  const { plan, trail, rigSnapshot, readiness, fuel, totals } = packet;
  const rig = rigSnapshot.profile;
  const notes = plan.fieldNotes;
  const title = tripLabel(plan);

  return (
    <>
      <div className={styles.screenActions} aria-label="Trip packet actions">
        <Button href="/plan" variant="ghost">
          ← Trip Builder
        </Button>
        <div>
          <Button href={`/trails/${trail.slug}`} variant="outline">
            Review trail
          </Button>
          <Button onClick={() => window.print()}>
            <PrintIcon />
            Print / save PDF
          </Button>
        </div>
      </div>

      <article className={styles.packetPaper}>
        <header className={styles.packetHeader}>
          <div className={styles.brandLockup}>
            <PacketMark />
            <div>
              <p>Switchback / Field packet</p>
              <span>Planning document · not a navigation source</span>
            </div>
          </div>
          <p className={styles.packetId}>Packet {plan.id.slice(-8).toUpperCase()}</p>
        </header>

        <section className={styles.titleBlock}>
          <div>
            <p>{trail.region} · {trail.state}</p>
            <h1>{title}</h1>
            <div className={styles.titleMeta}>
              <span>{formatFullDate(plan.startDate)}</span>
              <span>Party of {plan.partySize}</span>
              <span>{trail.name}</span>
            </div>
          </div>
          <div className={styles.difficultyStamp}>
            <span>Difficulty</span>
            <strong>{trail.difficulty}</strong>
            <small>of 5</small>
          </div>
        </section>

        <dl className={styles.statStrip}>
          <Stat label="Distance" value={formatNumber(totals.miles, 1)} unit="mi" />
          <Stat label="Wheel time" value={formatNumber(totals.wheelHours, 1)} unit="hr" />
          <Stat label="Days / nights" value={`${packet.days.length} / ${totals.nights}`} />
          <Stat label="High point" value={formatNumber(trail.maxElevationFt)} unit="ft" />
          <Stat label="Cell coverage" value={CELL_LABEL[trail.cellCoverage]} />
        </dl>

        <aside className={styles.safetyCallout}>
          <AlertIcon size={23} />
          <div>
            <strong>Planning only — do not navigate from this packet</strong>
            <p>
              Route lines, mileages, coordinates, conditions, and access can be
              incomplete or outdated. Before departure, verify official maps,
              closures, permits, weather, fire restrictions, and fuel
              availability. Carry current offline maps and an independent
              communication plan.
            </p>
          </div>
        </aside>

        <section className={styles.packetSection}>
          <SectionHeading number="01" eyebrow="Movement plan" title="Day-by-day itinerary" />
          <div className={styles.dayTimeline}>
            {packet.days.map((day) => (
              <DayCard key={day.plan.day} day={day} startDate={plan.startDate} />
            ))}
          </div>
        </section>

        <section className={styles.packetSection}>
          <SectionHeading number="02" eyebrow="Range check" title="Fuel and rig readiness" />
          <div className={styles.twoColumn}>
            <div className={styles.fuelCard}>
              <div className={fuel.ok ? styles.statusPass : styles.statusFail}>
                <FuelIcon size={22} />
                <div>
                  <small>Fuel plan</small>
                  <strong>{fuel.ok ? "Within modeled range" : "Range intervention required"}</strong>
                </div>
              </div>
              <dl>
                <Stat label="Rated range" value={rig.fuelRangeMiles} unit="mi" />
                <Stat label="Off-road range" value={fuel.effectiveRangeMiles} unit="mi" />
                <Stat label="Worst gap" value={formatNumber(fuel.worstGapMiles, 1)} unit="mi" />
              </dl>
              <p>
                The off-road estimate derates rated range by 50%. Reconfirm
                consumption with your actual load, terrain, weather, and driving
                style; carry reserve fuel when the margin is narrow.
              </p>
            </div>

            <div className={styles.readinessCard}>
              <div className={styles.readinessTitle}>
                <div>
                  <small>Frozen build</small>
                  <strong>{rigSnapshot.buildName}</strong>
                  <span>{rig.vehicle}</span>
                </div>
                <b data-verdict={readiness.verdict}>
                  {readiness.verdict.replace("-", " ")}
                </b>
              </div>
              <ul>
                {readiness.reasons.map((reason) => (
                  <li key={reason.label}>
                    <span data-status={reason.status}>{STATUS_LABEL[reason.status]}</span>
                    <div>
                      <strong>{reason.label}</strong>
                      <p>{reason.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <dl className={styles.rigStrip}>
            <Stat label="Tires" value={rig.tireIn} unit="in" />
            <Stat label="Clearance" value={rig.clearanceIn} unit="in" />
            <Stat label="4-Lo" value={rig.hasFourLo ? "Yes" : "No"} />
            <Stat label="Lockers" value={rig.hasLockers ? "Yes" : "No"} />
            <Stat label="Winch" value={rig.hasWinch ? "Yes" : "No"} />
            <Stat label="Payload" value={formatNumber(rig.payloadLbs)} unit="lb" />
          </dl>
        </section>

        <section className={styles.packetSection}>
          <SectionHeading number="03" eyebrow="Route manifest" title="Waypoints and hazards" />
          <table className={styles.waypointTable} aria-label="Route waypoints">
            <thead>
              <tr className={styles.waypointHeader}>
                <th scope="col">Mile</th>
                <th scope="col">Type / location</th>
                <th scope="col">Field note</th>
                <th scope="col">Coordinates</th>
              </tr>
            </thead>
            <tbody>
              {packet.waypoints.map((waypoint) => (
                <tr className={styles.waypointRow} key={waypoint.id}>
                  <td>{formatNumber(waypoint.mileMarker, 1)}</td>
                  <td>
                    <span className={styles.waypointName}>
                      <i><WaypointGlyph waypoint={waypoint} /></i>
                      <span>
                        <b>{WAYPOINT_LABEL[waypoint.kind]}</b>
                        <strong>{waypoint.name}</strong>
                      </span>
                    </span>
                  </td>
                  <td>{waypoint.description}</td>
                  <td>{formatCoords(waypoint.lat, waypoint.lng)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className={styles.packetSection}>
          <SectionHeading number="04" eyebrow="Recovery trail" title="Crew and emergency details" />
          <div className={styles.fieldGrid}>
            <div>
              <small>Trip leader</small>
              <strong>{notes?.tripLeader || "________________________________"}</strong>
            </div>
            <div>
              <small>Check-in deadline</small>
              <strong>{formatCheckIn(notes?.checkInBy) || "________________________________"}</strong>
            </div>
            <div>
              <small>Emergency contact</small>
              <strong>{notes?.emergencyContact || "________________________________"}</strong>
            </div>
            <div>
              <small>Emergency phone / satellite</small>
              <strong>{notes?.emergencyPhone || "________________________________"}</strong>
            </div>
          </div>
          <div className={styles.notesBlock}>
            <small>Crew, permit, medical, meetup, and weather notes</small>
            {notes?.notes ? (
              <p>{notes.notes}</p>
            ) : (
              <div aria-label="Blank lines for handwritten notes">
                <span />
                <span />
                <span />
              </div>
            )}
          </div>
        </section>

        <section className={styles.packetSection}>
          <SectionHeading number="05" eyebrow="Load plan" title="Packing checklist" />
          <div className={styles.loadoutSummary}>
            <p>
              <strong>{totals.checkedItems} / {totals.totalItems}</strong>
              <span>items marked packed</span>
            </p>
            <p>
              <strong>{formatNumber(packet.packedLoadout.totalLbs, 1)} / {formatNumber(packet.suggestedLoadout.totalLbs, 1)} lb</strong>
              <span>packed / suggested</span>
            </p>
            <p>
              <strong>{formatNumber(packet.suggestedLoadout.pctOfPayload, 1)}%</strong>
              <span>of frozen rig payload</span>
            </p>
          </div>
          <div className={styles.gearColumns}>
            {packet.gearGroups.map((group) => (
              <GearGroup key={group.category} category={group.category} packet={packet} />
            ))}
          </div>
        </section>

        <section className={styles.packetSection}>
          <SectionHeading number="06" eyebrow="Departure gate" title="Verify before wheels roll" />
          <ul className={styles.departureChecks}>
            {[
              "Official route status, seasonal gates, and land-manager closures checked",
              "Weather, flash-flood, avalanche, and fire restrictions checked",
              "Permits, passes, camping rules, and vehicle requirements confirmed",
              "Offline navigation downloaded and paper backup packed",
              "Fuel, water, and emergency contact plan confirmed with the crew",
              "Trip packet left with the off-trail emergency contact",
            ].map((item) => (
              <li key={item}><span />{item}</li>
            ))}
          </ul>
        </section>

        <footer className={styles.packetFooter}>
          <div>
            <strong>Switchback</strong>
            <span>Plan the route. Ready the rig. Chase the weekend.</span>
          </div>
          <div>
            <span>
              {trail.dataSource
                ? [
                    trail.dataSource.attribution,
                    trail.dataSource.name,
                    trail.dataSource.license,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : "Editorial route data"}
            </span>
            <span>
              {formatMiles(trail.distanceMiles)} · {formatFeet(trail.elevationGainFt)} gain · {trail.terrain.map(formatKind).join(" / ")}
            </span>
          </div>
        </footer>
      </article>
    </>
  );
}

export function TripPacketClient({ tripId }: { tripId: string }) {
  const { trips, hydrated } = useSavedTrips();
  const trip = hydrated ? trips.find((candidate) => candidate.id === tripId) : null;
  const packet = useMemo(() => (trip ? buildTripPacket(trip) : null), [trip]);

  if (!hydrated) {
    return (
      <div className={styles.loadingState} aria-label="Loading trip packet">
        <div />
        <div />
        <div />
      </div>
    );
  }
  if (!trip) return <EmptyPacket />;
  if (!packet) return <EmptyPacket invalid />;
  return <Packet packet={packet} />;
}
