/**
 * Internal types for the trail import pipeline. These never ship to the app;
 * the pipeline's only public output is `lib/data/trails.generated.ts` typed
 * against the app's `Trail` type.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export type SourceKind = "mvum" | "osm";

/** A named route assembled from raw source segments, pre-enrichment. */
export interface RouteCandidate {
  /** Display name, title-cased. */
  name: string;
  slug: string;
  source: SourceKind;
  /** Assembled, ordered, deduped polyline. */
  line: LatLng[];
  miles: number;
  /** Source-specific attributes kept for heuristics + provenance. */
  attrs: {
    /** MVUM: forest road/trail number (e.g. "869"). OSM: way ref tag. */
    ref?: string;
    /** MVUM surfacetype or OSM surface tag. */
    surface?: string;
    /** MVUM seasonal field ("yearlong" | "seasonal"). */
    seasonal?: string;
    /** True when the route is open to >50" 4WD vehicles (MVUM) or 4wd_only (OSM). */
    fourWd?: boolean;
    /** MVUM: highway-legal-only segments present. */
    highwayLegalOnly?: boolean;
    forestName?: string;
    districtName?: string;
    /** OSM raw tags of the longest member way. */
    osmTags?: Record<string, string>;
  };
  /** True when the name matched the region whitelist. */
  whitelisted: boolean;
}

export interface RegionConfig {
  key: string;
  /** Trail.region display value. */
  region: string;
  state: string;
  source: SourceKind;
  /** Number of trails to select from this region. */
  target: number;
  /** Case-insensitive regexes; matching route names are always selected. */
  whitelist: RegExp[];
  /** Routes shorter than this are dropped. */
  minMiles: number;
  /** MVUM: ArcGIS `where` clause. */
  mvumWhere?: string;
  /** OSM: Overpass bbox as [south, west, north, east]. */
  bbox?: [number, number, number, number];
}
