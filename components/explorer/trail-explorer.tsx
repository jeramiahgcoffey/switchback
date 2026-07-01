"use client";

/**
 * Trail Explorer orchestrator.
 *
 * - Filters live in URL searchParams (shareable). Updates go through
 *   window.history.replaceState, Next.js shallow routing, so typing through
 *   filters never re-renders the server tree or resets scroll.
 * - One `hoveredSlug` drives both views: hovering a card highlights its map
 *   marker; hovering a marker highlights (and scrolls to) its card.
 * - The Leaflet chunk is client-only (`ssr: false`) and mounts once per
 *   surface: a sticky right pane on lg+, a toggleable bottom sheet below.
 */

import dynamic from "next/dynamic";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { trails } from "@/lib/data/trails";
import { FilterRail } from "@/components/explorer/filter-rail";
import { TrailCard } from "@/components/explorer/trail-card";
import { ActiveRigChip } from "@/components/explorer/readiness-badge";
import { MapGhost } from "@/components/explorer/explorer-skeleton";
import {
  countActiveFilters,
  parseFilters,
  serializeFilters,
  trailMatches,
  type ExplorerFilters,
  type ExplorerMarker,
} from "@/components/explorer/filters";

const ExplorerMap = dynamic(() => import("@/components/explorer/explorer-map"), {
  ssr: false,
  loading: () => <MapGhost />,
});

function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

function toMarker(trail: (typeof trails)[number]): ExplorerMarker {
  const head = trail.waypoints.find((w) => w.kind === "trailhead") ?? trail.waypoints[0];
  return {
    slug: trail.slug,
    name: trail.name,
    difficulty: trail.difficulty,
    lat: head?.lat ?? trail.track[0].lat,
    lng: head?.lng ?? trail.track[0].lng,
    distanceMiles: trail.distanceMiles,
    estimatedDays: trail.estimatedDays,
  };
}

export function TrailExplorer() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const activeCount = countActiveFilters(filters);

  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [railOpen, setRailOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const setFilters = useCallback(
    (next: ExplorerFilters) => {
      const qs = serializeFilters(next);
      window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname],
  );
  const clearFilters = useCallback(
    () => setFilters({ difficulty: [], terrain: [], seasons: [], lengths: [], states: [] }),
    [setFilters],
  );

  const matched = useMemo(() => trails.filter((t) => trailMatches(t, filters)), [filters]);
  const matchedMarkers = useMemo(() => matched.map(toMarker), [matched]);
  const dimmedMarkers = useMemo(() => {
    const kept = new Set(matched.map((t) => t.slug));
    return trails.filter((t) => !kept.has(t.slug)).map(toMarker);
  }, [matched]);

  // Marker hover -> highlight the card and bring it into view.
  const cardRefs = useRef(new Map<string, HTMLElement>());
  const handleMarkerHover = useCallback((slug: string | null) => {
    setHoveredSlug(slug);
    if (slug) {
      cardRefs.current.get(slug)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, []);

  // Bottom sheet: lock body scroll while open, close on Escape.
  const mobileSheetOpen = sheetOpen && !isDesktop;
  useEffect(() => {
    if (!mobileSheetOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheetOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileSheetOpen]);

  return (
    <div className="mx-auto w-full max-w-[1720px] px-4 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_clamp(20rem,36vw,34rem)] lg:gap-8">
      {/* ---------------------------------------------- rail + results */}
      <div className="py-6 lg:grid lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-8">
        {/* Mobile filter disclosure */}
        <div className="mb-4 lg:hidden">
          <button
            type="button"
            aria-expanded={railOpen}
            onClick={() => setRailOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded border border-edge bg-gunmetal px-3 py-2.5 font-display text-sm font-semibold uppercase tracking-[0.12em] text-bone transition-colors duration-150 hover:border-edge-strong"
          >
            <span>
              Filters
              {activeCount > 0 ? (
                <span className="ml-2 rounded bg-ember/15 px-1.5 py-0.5 text-xs text-ember-bright">
                  {activeCount}
                </span>
              ) : null}
            </span>
            <span aria-hidden className="text-sand-dim">
              {railOpen ? "−" : "+"}
            </span>
          </button>
        </div>

        <div
          className={`${railOpen ? "block" : "hidden"} card-surface mb-6 p-4 lg:sticky lg:top-20 lg:mb-0 lg:block lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto lg:border-0 lg:bg-transparent lg:p-0`}
        >
          <FilterRail filters={filters} onChange={setFilters} />
        </div>

        <section aria-label="Matching trails" className="min-w-0">
          {/* toolbar */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p aria-live="polite" className="readout text-sm">
              {matched.length}
              <span className="text-sand-dim"> / {trails.length} routes</span>
            </p>
            <ActiveRigChip />
          </div>

          {matched.length > 0 ? (
            <div className="grid gap-4 pb-20 sm:grid-cols-2 lg:pb-6 2xl:grid-cols-3">
              {matched.map((trail) => (
                <TrailCard
                  key={trail.slug}
                  trail={trail}
                  active={hoveredSlug === trail.slug}
                  onHoverChange={(h) => setHoveredSlug(h ? trail.slug : null)}
                  registerRef={(el) => {
                    if (el) cardRefs.current.set(trail.slug, el);
                    else cardRefs.current.delete(trail.slug);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="card-surface relative overflow-hidden">
              <div aria-hidden className="absolute inset-0 bg-topo" />
              <div className="relative px-6 py-16 text-center sm:py-24">
                <p className="readout text-xs text-sand-dim">0 / {trails.length} ROUTES</p>
                <h2 className="heading-display mt-3 text-3xl">No trail fits that line</h2>
                <p className="mx-auto mt-3 max-w-sm text-sm text-sand-dim">
                  That combination filtered out the whole catalog. Loosen a facet
                  or start fresh. The dim dots on the map show what you&apos;re missing.
                </p>
                <div className="mt-8">
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear all filters
                  </Button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ---------------------------------------------- desktop map pane */}
      <div className="hidden lg:block">
        <div className="sticky top-16 py-6">
          <div className="card-surface relative h-[calc(100vh-7rem)] overflow-hidden">
            {isDesktop ? (
              <ExplorerMap
                matched={matchedMarkers}
                dimmed={dimmedMarkers}
                hoveredSlug={hoveredSlug}
                onMarkerHover={handleMarkerHover}
              />
            ) : (
              <MapGhost />
            )}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------- mobile map sheet */}
      {!isDesktop ? (
        <>
          <div className="fixed inset-x-0 bottom-5 z-40 flex justify-center lg:hidden">
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-ember bg-ember px-5 py-2.5 font-display text-sm font-semibold uppercase tracking-[0.12em] text-basalt-deep shadow-[0_10px_28px_rgb(0_0_0/0.45)] transition-colors duration-150 hover:bg-ember-bright"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <path
                  d="M1 3.5 5 2l4 1.5L13 2v8.5L9 12 5 10.5 1 12V3.5Z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
                <path d="M5 2v8.5M9 3.5V12" stroke="currentColor" strokeWidth="1.4" />
              </svg>
              Map · {matched.length}
            </button>
          </div>

          {mobileSheetOpen ? (
            <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Overview map">
              <style>{`
                @keyframes sb-sheet-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
                @media (prefers-reduced-motion: reduce) { .sb-sheet { animation: none !important; } }
              `}</style>
              <button
                type="button"
                aria-label="Close map"
                onClick={() => setSheetOpen(false)}
                className="absolute inset-0 bg-basalt-deep/70 backdrop-blur-[2px]"
              />
              <div className="sb-sheet absolute inset-x-0 bottom-0 flex h-[72vh] flex-col overflow-hidden rounded-t-xl border-t border-edge-strong bg-basalt [animation:sb-sheet-up_240ms_ease-out]">
                <div aria-hidden className="flex justify-center pt-2.5">
                  <span className="block h-1 w-10 rounded-full bg-edge-strong" />
                </div>
                <div className="flex items-center justify-between border-b border-edge px-4 pb-3 pt-1.5">
                  <p className="stat-label">
                    Overview map · {matched.length} route{matched.length === 1 ? "" : "s"}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSheetOpen(false)}
                    className="rounded border border-edge px-3 py-1.5 font-display text-xs font-semibold uppercase tracking-[0.12em] text-sand transition-colors duration-150 hover:border-edge-strong hover:text-bone"
                  >
                    Close
                  </button>
                </div>
                <div className="min-h-0 flex-1">
                  <ExplorerMap
                    matched={matchedMarkers}
                    dimmed={dimmedMarkers}
                    hoveredSlug={hoveredSlug}
                    onMarkerHover={setHoveredSlug}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
