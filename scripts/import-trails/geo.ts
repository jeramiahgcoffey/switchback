/**
 * Pure geometry helpers for the import pipeline: haversine math, segment
 * chaining (ordered and unordered), and even-spacing resampling.
 */
import type { LatLng } from "./pipeline-types.ts";

const EARTH_RADIUS_MI = 3958.7613;

export function haversineMiles(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.sqrt(s));
}

export function polylineMiles(pts: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += haversineMiles(pts[i - 1], pts[i]);
  return total;
}

/** Cumulative distance from the start at each vertex, in miles. */
export function cumulativeMiles(pts: LatLng[]): number[] {
  const out = [0];
  for (let i = 1; i < pts.length; i++) {
    out.push(out[i - 1] + haversineMiles(pts[i - 1], pts[i]));
  }
  return out;
}

function dedupeConsecutive(pts: LatLng[]): LatLng[] {
  const out: LatLng[] = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (!last || haversineMiles(last, p) > 0.001) out.push(p);
  }
  return out;
}

function appendOriented(chain: LatLng[], seg: LatLng[]): LatLng[] {
  const end = chain[chain.length - 1];
  const toStart = haversineMiles(end, seg[0]);
  const toEnd = haversineMiles(end, seg[seg.length - 1]);
  const oriented = toStart <= toEnd ? seg : [...seg].reverse();
  return dedupeConsecutive([...chain, ...oriented]);
}

function gapToChainEnd(chain: LatLng[], seg: LatLng[]): number {
  const end = chain[chain.length - 1];
  return Math.min(haversineMiles(end, seg[0]), haversineMiles(end, seg[seg.length - 1]));
}

/**
 * Chain segments that arrive in route order (MVUM sorted by begin milepost).
 * A gap larger than `gapToleranceMi` splits the route; the longest resulting
 * chain wins. Segment direction is normalized by nearest-endpoint matching.
 */
export function chainOrdered(segments: LatLng[][], gapToleranceMi: number): LatLng[] {
  const chains: LatLng[][] = [];
  let chain: LatLng[] = [];
  for (const seg of segments) {
    if (seg.length < 2) continue;
    if (chain.length === 0) {
      chain = dedupeConsecutive(seg);
      continue;
    }
    if (gapToChainEnd(chain, seg) <= gapToleranceMi) {
      chain = appendOriented(chain, seg);
    } else {
      chains.push(chain);
      chain = dedupeConsecutive(seg);
    }
  }
  if (chain.length) chains.push(chain);
  return chains.reduce(
    (best, c) => (polylineMiles(c) > polylineMiles(best) ? c : best),
    chains[0] ?? [],
  );
}

/**
 * Chain segments with no inherent order (OSM ways). Greedy: start from the
 * longest segment, repeatedly attach the nearest segment (within tolerance)
 * to either end of the growing chain, reversing as needed. Returns the
 * longest chain assembled.
 */
export function chainUnordered(segments: LatLng[][], gapToleranceMi: number): LatLng[] {
  const pool = segments.filter((s) => s.length >= 2).map(dedupeConsecutive);
  if (pool.length === 0) return [];
  const chains: LatLng[][] = [];

  while (pool.length) {
    pool.sort((a, b) => polylineMiles(b) - polylineMiles(a));
    let chain = pool.shift()!;
    let grew = true;
    while (grew && pool.length) {
      grew = false;
      for (let i = 0; i < pool.length; i++) {
        const seg = pool[i];
        const head = chain[0];
        const tail = chain[chain.length - 1];
        const dTail = Math.min(
          haversineMiles(tail, seg[0]),
          haversineMiles(tail, seg[seg.length - 1]),
        );
        const dHead = Math.min(
          haversineMiles(head, seg[0]),
          haversineMiles(head, seg[seg.length - 1]),
        );
        if (Math.min(dTail, dHead) > gapToleranceMi) continue;
        if (dTail <= dHead) {
          chain = appendOriented(chain, seg);
        } else {
          chain = appendOriented([...chain].reverse(), seg).reverse();
        }
        pool.splice(i, 1);
        grew = true;
        break;
      }
    }
    chains.push(chain);
  }
  return chains.reduce(
    (best, c) => (polylineMiles(c) > polylineMiles(best) ? c : best),
    chains[0],
  );
}

/**
 * Resample a polyline to `n` points at even distance intervals, keeping the
 * exact first and last vertices. Linear interpolation between vertices is
 * fine at trail scale.
 */
export function resample(pts: LatLng[], n: number): LatLng[] {
  if (pts.length <= 2 || n < 2) return pts;
  const cum = cumulativeMiles(pts);
  const total = cum[cum.length - 1];
  if (total === 0) return [pts[0], pts[pts.length - 1]];
  const out: LatLng[] = [pts[0]];
  let seg = 1;
  for (let i = 1; i < n - 1; i++) {
    const target = (total * i) / (n - 1);
    while (seg < pts.length - 1 && cum[seg] < target) seg++;
    const t = (target - cum[seg - 1]) / (cum[seg] - cum[seg - 1] || 1);
    out.push({
      lat: pts[seg - 1].lat + (pts[seg].lat - pts[seg - 1].lat) * t,
      lng: pts[seg - 1].lng + (pts[seg].lng - pts[seg - 1].lng) * t,
    });
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** Moving-average smooth (window 3) to knock DEM noise out of a profile. */
export function smooth(values: number[]): number[] {
  return values.map((v, i) => {
    const a = values[i - 1] ?? v;
    const b = values[i + 1] ?? v;
    return (a + v + b) / 3;
  });
}

/** Total climbing: sum of positive deltas over the smoothed profile. */
export function elevationGain(elevFt: number[]): number {
  const s = smooth(elevFt);
  let gain = 0;
  for (let i = 1; i < s.length; i++) {
    const d = s[i] - s[i - 1];
    if (d > 0) gain += d;
  }
  return Math.round(gain);
}

/**
 * Steepest sustained grade (%) over windows of roughly `windowMi`, using the
 * smoothed profile. Feeds the difficulty heuristic.
 */
export function maxSustainedGradePct(
  elevFt: number[],
  distancesMi: number[],
  windowMi = 0.5,
): number {
  const s = smooth(elevFt);
  let worst = 0;
  let j = 0;
  for (let i = 0; i < s.length; i++) {
    while (distancesMi[i] - distancesMi[j] > windowMi) j++;
    const run = distancesMi[i] - distancesMi[j];
    if (run < windowMi * 0.6) continue;
    const rise = Math.abs(s[i] - s[j]);
    const grade = (rise / (run * 5280)) * 100;
    if (grade > worst) worst = grade;
  }
  return Math.round(worst * 10) / 10;
}
