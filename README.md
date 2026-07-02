# Switchback

**Plan the route. Ready the rig. Chase the weekend.**

Switchback is an overland trip planner: browse curated off-road trails, check whether your rig can actually run them, and build a day-by-day itinerary with fuel checks and a packing loadout, all in the browser, no account required.

## Features

- **Trail Explorer** (`/trails`): 60+ US overland routes with difficulty, terrain, season, and mileage filters, an interactive Leaflet map, and a live go / caution / no-go readiness badge for your active rig on every card. Most routes are imported from real public data (see Trail data below); a hand-authored seed set covers the rest of the country.
- **Trail Detail** (`/trails/[slug]`): statically generated pages with a stat band, an elevation profile synced to the route map, a waypoint timeline (campsites, fuel, water, obstacles, bailouts), and a requirements panel scored against your rig.
- **Trip Builder** (`/plan`): a three-step wizard. Pick a trail and rig, split the route into drivable days with a fuel-range check, then finish with a generated pre-trip checklist. Plans persist across visits.
- **Garage** (`/garage`): choose one of four rig profiles, tune its specs (tires, clearance, range, lockers, winch, and more), see a readiness matrix against every trail, and build a gear loadout from a 70-item catalog with a live payload bar.
- **One source of truth**: every readiness verdict and number comes from the same pure functions in `lib/derive.ts`, so the Explorer, Detail, Plan, and Garage surfaces always agree.
- **Local-first state**: the active rig and trip plan live in typed `localStorage` hooks built on `useSyncExternalStore`, with hydration guards and cross-tab sync. No backend, no API keys.

## Stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack, static generation)
- [React 19](https://react.dev) + TypeScript
- [Tailwind CSS 4](https://tailwindcss.com)
- [Leaflet](https://leafletjs.com) / react-leaflet for maps
- Static, fully typed trail data under `lib/data/`, no runtime external services
- A Node import pipeline (`scripts/import-trails/`) that builds the catalog from public GIS sources

## Running locally

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts:

```bash
npm run build          # production build
npm run start          # serve the production build
npm run lint           # eslint
npm run import-trails  # rebuild lib/data/trails.generated.ts from public GIS sources
```

## Trail data

Two catalogs merge at build time in `lib/data/trails.ts` (imported entries win on slug collisions):

- **Hand-authored seed** (the seed array in `lib/data/trails.ts`): 12 illustrative routes with editorial waypoints.
- **Imported catalog** (`lib/data/trails.generated.ts`): rebuilt by `npm run import-trails` from:
  - **USFS Motor Vehicle Use Map** via the [FSGeodata EDW ArcGIS services](https://data.fs.usda.gov/geodata/) (US federal data, public domain) for National Forest routes (Colorado San Juans).
  - **OpenStreetMap** via the [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) for BLM/NPS country (Moab). (c) OpenStreetMap contributors, licensed [ODbL 1.0](https://opendatacommons.org/licenses/odbl/); the derived trail data in this repo remains available under ODbL terms.
  - **Elevation**: USGS NED 10m sampled through [Open Topo Data](https://www.opentopodata.org/) (public domain).

The pipeline assembles route segments into named trails, samples real elevation profiles, derives stats and difficulty heuristics, and generates each trail's hero art from its own elevation profile. Editorial curation (reputation difficulty, named obstacles, campsites) lives in `scripts/import-trails/overrides.ts`. Run `node scripts/import-trails/validate.ts` to check the generated catalog against the app's derive logic.

Route alignments are simplified for trip planning. They are not for navigation.

## Deployment

Switchback is a standard Next.js App Router app with no server-side data dependencies or environment variables, so it deploys to any Next.js host.

**Vercel (recommended):**

1. Push this repo to GitHub (already wired if you cloned it from there).
2. Import the repo at [vercel.com/new](https://vercel.com/new). Vercel auto-detects Next.js; no build settings needed.
3. Every push to `main` triggers a production deploy.

The production domain is set via `metadataBase` in `app/layout.tsx` (currently `https://switchback.jeramiahcoffey.com`). Update that value to match your own domain so Open Graph and canonical URLs resolve correctly.

There are no required environment variables. The map uses keyless OpenStreetMap tiles and all trail, rig, and gear data is static.

## Screenshots

TODO

## Project layout

```
app/            routes: /, /trails, /trails/[slug], /plan, /garage
components/     feature UI grouped by surface (explorer, trail-detail, plan, garage, ui)
lib/data/       trail catalogs (seed + generated), rigs, gear
lib/derive.ts   pure derived logic (readiness scoring, day splitting, fuel checks)
lib/storage.ts  typed localStorage hooks (active rig, trip plan)
lib/types.ts    domain types
scripts/
  import-trails/  trail data import pipeline (MVUM + OSM -> trails.generated.ts)
```
