import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardMedia } from "@/components/ui/card";
import { DifficultyDiamonds, DIFFICULTY_META } from "@/components/ui/difficulty";
import { trails } from "@/lib/data/trails";
import { formatCoords } from "@/lib/derive";

// ---------------------------------------------------------------------------
// Live stats computed from seed data
// ---------------------------------------------------------------------------

const totalMiles = Math.round(trails.reduce((sum, t) => sum + t.distanceMiles, 0));
const highestPass = trails.reduce((max, t) => (t.maxElevationFt > max.maxElevationFt ? t : max), trails[0]);
const waypointCount = trails.reduce((sum, t) => sum + t.waypoints.length, 0);

const FEATURED_SLUGS = ["white-rim-trail", "black-bear-pass", "mojave-road"];
const featured = FEATURED_SLUGS.map((slug) => trails.find((t) => t.slug === slug)!).filter(Boolean);

const STATS = [
  { label: "Trail miles mapped", value: totalMiles.toLocaleString("en-US"), unit: "mi" },
  { label: "Highest pass", value: highestPass.maxElevationFt.toLocaleString("en-US"), unit: "ft" },
  { label: "Waypoints plotted", value: waypointCount.toLocaleString("en-US"), unit: "pts" },
  { label: "Curated routes", value: String(trails.length), unit: "trails" },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Pick a trail",
    body: "Filter real US overland routes by difficulty, terrain, season, and state. Every trailhead plotted on the map.",
    href: "/trails",
    cta: "Browse trails",
  },
  {
    step: "02",
    title: "Build your plan",
    body: "Auto-split the route into camp-to-camp days with mileage, wheel hours, and fuel and water resupply flags.",
    href: "/plan",
    cta: "Open trip builder",
  },
  {
    step: "03",
    title: "Pack the rig",
    body: "A condition-aware checklist and payload budget tuned to your rig, your party, and your season.",
    href: "/garage",
    cta: "Set up your rig",
  },
];

export default function Home() {
  return (
    <div>
      {/* ------------------------------------------------ hero */}
      <section className="relative overflow-hidden border-b border-edge">
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/images/hero.svg)" }}
        />
        <div aria-hidden className="absolute inset-0 bg-topo" />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-basalt via-basalt/60 to-basalt/30"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-36">
          <p className="readout text-xs text-sand-dim sm:text-sm">
            {formatCoords(38.5733, -109.5498)} · MOAB BASECAMP
          </p>
          <h1 className="heading-display mt-4 max-w-3xl text-6xl leading-[0.95] sm:text-8xl">
            Plan the route.
            <br />
            Ready the rig.
            <br />
            <span className="text-ember">Chase the weekend.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base text-sand sm:text-lg">
            Switchback turns a trail wishlist into a concrete plan: curated
            overland routes, day-by-day itineraries anchored on real campsites,
            and a readiness check for the rig in your driveway.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Button href="/trails" size="lg">
              Explore trails
            </Button>
            <Button href="/plan" variant="outline" size="lg">
              Build a trip plan
            </Button>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ stat band */}
      <section aria-label="Catalog stats" className="border-b border-edge bg-basalt-deep">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px sm:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="px-4 py-8 sm:px-6">
              <p className="readout text-3xl sm:text-4xl">
                {s.value}
                <span className="ml-1.5 text-sm text-sand-dim">{s.unit}</span>
              </p>
              <p className="stat-label mt-2">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------ featured trails */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="stat-label">Featured routes</p>
            <h2 className="heading-display mt-2 text-4xl sm:text-5xl">
              Where to next?
            </h2>
          </div>
          <Link
            href="/trails"
            className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-ember-bright transition-colors hover:text-ember"
          >
            All {trails.length} trails →
          </Link>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((trail) => {
            const trailhead = trail.waypoints.find((w) => w.kind === "trailhead");
            return (
              <Link key={trail.slug} href={`/trails/${trail.slug}`} className="group block">
                <Card lift className="h-full">
                  <CardMedia className="h-44">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={trail.heroImage}
                      alt={`${trail.name} landscape`}
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute left-3 top-3">
                      <Badge tone={trail.difficulty >= 5 ? "rust" : trail.difficulty >= 4 ? "ember" : trail.difficulty >= 3 ? "amber" : "sage"}>
                        Diff {trail.difficulty} · {DIFFICULTY_META[trail.difficulty].label}
                      </Badge>
                    </span>
                  </CardMedia>
                  <CardBody>
                    <h3 className="heading-display text-2xl transition-colors duration-150 group-hover:text-ember-bright">
                      {trail.name}
                    </h3>
                    {trailhead ? (
                      <p className="readout mt-1 text-xs text-sand-dim">
                        {formatCoords(trailhead.lat, trailhead.lng)}
                      </p>
                    ) : null}
                    <p className="mt-3 line-clamp-2 text-sm text-sand-dim">{trail.summary}</p>
                    <div className="mt-4 flex items-center justify-between border-t border-edge pt-4">
                      <DifficultyDiamonds level={trail.difficulty} />
                      <p className="readout text-xs">
                        {trail.distanceMiles} mi · {trail.estimatedDays}d ·{" "}
                        {trail.maxElevationFt.toLocaleString("en-US")} ft
                      </p>
                    </div>
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      <hr className="divider-route mx-auto max-w-6xl" />

      {/* ------------------------------------------------ how it works */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <p className="stat-label">How it works</p>
        <h2 className="heading-display mt-2 text-4xl sm:text-5xl">
          Trailhead in three moves
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {HOW_IT_WORKS.map((item) => (
            <Card key={item.step} className="flex h-full flex-col p-6">
              <p className="readout text-sm text-ember">{item.step}</p>
              <h3 className="heading-display mt-3 text-2xl">{item.title}</h3>
              <p className="mt-3 flex-1 text-sm text-sand-dim">{item.body}</p>
              <div className="mt-6">
                <Button href={item.href} variant="outline" size="sm">
                  {item.cta}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------ closing CTA */}
      <section className="relative overflow-hidden border-t border-edge bg-basalt-deep">
        <div aria-hidden className="absolute inset-0 bg-topo" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <h2 className="heading-display text-4xl sm:text-5xl">
            The weekend won&apos;t chase itself
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm text-sand-dim">
            Pick a route, check it against your rig, and roll out with a plan
            that already knows where you&apos;re sleeping.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Button href="/trails" size="lg">
              Find your trail
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
