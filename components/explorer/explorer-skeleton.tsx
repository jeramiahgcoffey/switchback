/**
 * Server-safe skeletons for the Trail Explorer. Shared by app/trails/loading.tsx
 * (route-level) and the page's Suspense fallback so both paint identically.
 */

const SHIMMER = "animate-pulse rounded bg-gunmetal-light/60";

/** Static header band — real text, no shimmer, identical in page + loading. */
export function ExplorerHeader() {
  return (
    <section className="relative overflow-hidden border-b border-edge bg-basalt-deep">
      <div aria-hidden className="absolute inset-0 bg-topo" />
      <div className="relative mx-auto w-full max-w-[1720px] px-4 py-10 sm:px-6 sm:py-12">
        <p className="stat-label">Trail Explorer</p>
        <h1 className="heading-display mt-2 text-4xl sm:text-6xl">Pick your line</h1>
        <p className="mt-4 max-w-xl text-sm text-sand-dim sm:text-base">
          Twelve curated overland routes, every trailhead on the map. Dial in
          difficulty, terrain, season, trip length, and state — the URL carries
          your filters, so any view is shareable.
        </p>
      </div>
    </section>
  );
}

function CardGhost() {
  return (
    <div className="card-surface overflow-hidden">
      <div className={`h-36 w-full ${SHIMMER} rounded-b-none`} />
      <div className="space-y-3 p-4 sm:p-5">
        <div className={`h-5 w-2/3 ${SHIMMER}`} />
        <div className={`h-3 w-1/2 ${SHIMMER}`} />
        <div className={`h-3 w-full ${SHIMMER}`} />
        <div className="flex gap-1.5 pt-1">
          <div className={`h-5 w-16 ${SHIMMER}`} />
          <div className={`h-5 w-14 ${SHIMMER}`} />
          <div className={`h-5 w-20 ${SHIMMER}`} />
        </div>
        <div className={`h-3 w-3/5 ${SHIMMER}`} />
      </div>
    </div>
  );
}

export function ExplorerSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1720px] px-4 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_clamp(20rem,36vw,34rem)] lg:gap-8">
      <div className="py-6 lg:grid lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-8">
        {/* filter rail ghost */}
        <div className="hidden space-y-6 lg:block" aria-hidden>
          <div className={`h-6 w-24 ${SHIMMER}`} />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-2.5">
              <div className={`h-3 w-20 ${SHIMMER}`} />
              <div className="flex flex-wrap gap-1.5">
                <div className={`h-7 w-16 ${SHIMMER}`} />
                <div className={`h-7 w-20 ${SHIMMER}`} />
                <div className={`h-7 w-14 ${SHIMMER}`} />
              </div>
            </div>
          ))}
        </div>
        {/* results ghost */}
        <div>
          <div className="mb-5 flex items-center justify-between" aria-hidden>
            <div className={`h-4 w-28 ${SHIMMER}`} />
            <div className={`h-8 w-52 ${SHIMMER}`} />
          </div>
          <p className="sr-only" role="status">
            Loading trails…
          </p>
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3" aria-hidden>
            {Array.from({ length: 6 }, (_, i) => (
              <CardGhost key={i} />
            ))}
          </div>
        </div>
      </div>
      {/* map ghost */}
      <div className="hidden lg:block" aria-hidden>
        <div className="sticky top-16 py-6">
          <div className="card-surface relative h-[calc(100vh-7rem)] overflow-hidden">
            <div className="absolute inset-0 animate-pulse bg-gunmetal" />
            <div className="absolute inset-0 bg-topo" />
            <p className="absolute inset-0 flex items-center justify-center font-display text-xs font-semibold uppercase tracking-[0.14em] text-sand-dim">
              Plotting trailheads…
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Ghost shown while the Leaflet chunk itself streams in (next/dynamic). */
export function MapGhost() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-basalt-deep" aria-hidden>
      <div className="absolute inset-0 bg-topo" />
      <p className="absolute inset-0 flex items-center justify-center font-display text-xs font-semibold uppercase tracking-[0.14em] text-sand-dim">
        Plotting trailheads…
      </p>
    </div>
  );
}
