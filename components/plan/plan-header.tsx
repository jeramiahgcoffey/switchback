/**
 * Server-safe page hero for the Trip Builder, shared by app/plan/page.tsx
 * and app/plan/loading.tsx so the route-level loading UI paints the exact
 * frame the page resolves into.
 */
export function PlanHeader() {
  return (
    <section className="relative overflow-hidden border-b border-edge bg-basalt-deep">
      <div aria-hidden className="absolute inset-0 bg-topo" />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-basalt via-transparent to-transparent"
      />
      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <p className="stat-label">Trip Builder</p>
        <h1 className="heading-display mt-2 text-4xl sm:text-6xl">
          Build your plan
        </h1>
        <p className="mt-4 max-w-xl text-sm text-sand-dim sm:text-base">
          Three steps from daydream to departure: pick the route and crew, let
          the itinerary split itself on real campsites, and pack a list built
          for the season and terrain. Everything saves to this device as you
          go.
        </p>
      </div>
    </section>
  );
}
