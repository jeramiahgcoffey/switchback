"use client";

import { useCallback, useId, useMemo, useRef } from "react";
import type { PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import type { Trail } from "@/lib/types";
import { nearestTrackIndex } from "@/lib/derive";
import { WAYPOINT_META } from "./waypoint-icons";

/**
 * Hand-built SVG area chart of the trail's TrackPoints (elevation vs
 * distanceFromStartMi). `hoverIndex` is the single shared trackPosition:
 * hovering the chart reports an index up to the parent, and an index set by
 * the map (or timeline) draws the cursor here. No chart library.
 */

const W = 880;
const H = 300;
const M = { top: 24, right: 18, bottom: 40, left: 60 } as const;
const PLOT_W = W - M.left - M.right;
const PLOT_H = H - M.top - M.bottom;

/** Pick a "nice" tick step (1/2/2.5/5 x 10^n) for roughly `target` ticks. */
function niceStep(range: number, target: number): number {
  const raw = range / Math.max(1, target);
  const pow = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1e-6))));
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (raw <= m * pow) return m * pow;
  }
  return 10 * pow;
}

function fmtFt(ft: number): string {
  return Math.round(ft).toLocaleString("en-US");
}

export function ElevationProfile({
  trail,
  hoverIndex,
  onHoverIndex,
}: {
  trail: Trail;
  hoverIndex: number | null;
  onHoverIndex: (index: number | null) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gradientId = useId();

  const geo = useMemo(() => {
    const pts = trail.track;
    const maxMi = Math.max(
      pts[pts.length - 1]?.distanceFromStartMi ?? 0,
      trail.distanceMiles,
    );
    let minE = Infinity;
    let maxE = -Infinity;
    let minIdx = 0;
    let maxIdx = 0;
    pts.forEach((p, i) => {
      if (p.elevationFt < minE) {
        minE = p.elevationFt;
        minIdx = i;
      }
      if (p.elevationFt > maxE) {
        maxE = p.elevationFt;
        maxIdx = i;
      }
    });
    const pad = Math.max(80, (maxE - minE) * 0.12);
    const lo = minE - pad;
    const hi = maxE + pad;

    const x = (mi: number) => M.left + (mi / maxMi) * PLOT_W;
    const y = (e: number) => M.top + (1 - (e - lo) / (hi - lo)) * PLOT_H;

    const line = pts
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"}${x(p.distanceFromStartMi).toFixed(2)},${y(p.elevationFt).toFixed(2)}`,
      )
      .join("");
    const baseY = H - M.bottom;
    const area = `${line}L${x(pts[pts.length - 1].distanceFromStartMi).toFixed(2)},${baseY}L${x(pts[0].distanceFromStartMi).toFixed(2)},${baseY}Z`;

    const yStep = niceStep(maxE - minE, 4);
    const yTicks: number[] = [];
    for (let t = Math.ceil(lo / yStep) * yStep; t <= hi; t += yStep) {
      if (t >= lo + yStep * 0.25 && t <= hi - yStep * 0.1) yTicks.push(t);
    }
    const xStep = niceStep(maxMi, 7);
    const xTicks: number[] = [];
    for (let t = 0; t <= maxMi + 0.001; t += xStep) xTicks.push(t);

    return { maxMi, minE, maxE, minIdx, maxIdx, x, y, line, area, baseY, yTicks, xTicks };
  }, [trail]);

  const indexFromClientX = useCallback(
    (clientX: number): number | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      if (rect.width === 0) return null;
      const vx = ((clientX - rect.left) / rect.width) * W;
      const mi = ((vx - M.left) / PLOT_W) * geo.maxMi;
      return nearestTrackIndex(trail, Math.min(geo.maxMi, Math.max(0, mi)));
    },
    [geo.maxMi, trail],
  );

  const handlePointer = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      onHoverIndex(indexFromClientX(e.clientX));
    },
    [indexFromClientX, onHoverIndex],
  );

  const handleKey = useCallback(
    (e: ReactKeyboardEvent<SVGSVGElement>) => {
      const len = trail.track.length;
      const cur = hoverIndex ?? 0;
      const stride = e.shiftKey ? 5 : 1;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        onHoverIndex(Math.min(len - 1, cur + stride));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        onHoverIndex(Math.max(0, cur - stride));
      } else if (e.key === "Home") {
        e.preventDefault();
        onHoverIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        onHoverIndex(len - 1);
      } else if (e.key === "Escape") {
        onHoverIndex(null);
      }
    },
    [hoverIndex, onHoverIndex, trail.track.length],
  );

  const hp =
    hoverIndex != null
      ? trail.track[Math.min(Math.max(hoverIndex, 0), trail.track.length - 1)]
      : null;

  const minPt = trail.track[geo.minIdx];
  const maxPt = trail.track[geo.maxIdx];

  // Clamp callout label x so text never leaves the plot.
  const clampX = (vx: number, halfWidth = 44) =>
    Math.min(W - M.right - halfWidth, Math.max(M.left + halfWidth, vx));

  // Tooltip box geometry. Flips to the left near the right edge.
  const tooltip = hp
    ? (() => {
        const cx = geo.x(hp.distanceFromStartMi);
        const boxW = 128;
        const boxH = 46;
        const tx = cx + 14 + boxW > W - M.right ? cx - 14 - boxW : cx + 14;
        const ty = Math.min(
          Math.max(geo.y(hp.elevationFt) - boxH - 10, M.top),
          H - M.bottom - boxH - 4,
        );
        return { cx, cy: geo.y(hp.elevationFt), tx, ty, boxW, boxH };
      })()
    : null;

  return (
    <section aria-label="Elevation profile" className="card-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 className="stat-label">Elevation profile</h2>
          <p className="readout text-xs text-sand-dim">
            MIN {fmtFt(geo.minE)} FT · MAX {fmtFt(geo.maxE)} FT
          </p>
        </div>
        <p className="readout text-xs" aria-live="off">
          {hp ? (
            <span className="text-ember-bright">
              MI {hp.distanceFromStartMi.toFixed(1)} · {fmtFt(hp.elevationFt)} FT
            </span>
          ) : (
            <span className="text-sand-dim">
              {fmtFt(trail.elevationGainFt)} FT TOTAL GAIN
            </span>
          )}
        </p>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="mt-3 h-auto w-full cursor-crosshair touch-pan-y select-none"
        role="img"
        aria-label={`Elevation profile for ${trail.name}: from ${fmtFt(geo.minE)} to ${fmtFt(geo.maxE)} feet over ${geo.maxMi.toFixed(0)} miles. Use arrow keys to scrub the route.`}
        tabIndex={0}
        onPointerMove={handlePointer}
        onPointerDown={handlePointer}
        onPointerLeave={() => onHoverIndex(null)}
        onKeyDown={handleKey}
        onBlur={() => onHoverIndex(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E8622C" stopOpacity="0.42" />
            <stop offset="70%" stopColor="#E8622C" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#E8622C" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* horizontal gridlines + y labels */}
        {geo.yTicks.map((t) => (
          <g key={`y-${t}`}>
            <line
              x1={M.left}
              x2={W - M.right}
              y1={geo.y(t)}
              y2={geo.y(t)}
              stroke="rgb(216 205 187 / 0.10)"
              strokeDasharray="4 5"
            />
            <text
              x={M.left - 8}
              y={geo.y(t) + 3.5}
              textAnchor="end"
              fontSize="10.5"
              fill="#A69D8B"
              fontFamily="var(--font-jetbrains-mono), monospace"
            >
              {fmtFt(t)}
            </text>
          </g>
        ))}
        <text
          x={M.left - 8}
          y={M.top - 8}
          textAnchor="end"
          fontSize="9.5"
          fill="#A69D8B"
          fontFamily="var(--font-jetbrains-mono), monospace"
          letterSpacing="0.08em"
        >
          FT
        </text>

        {/* x axis ticks + labels */}
        <line
          x1={M.left}
          x2={W - M.right}
          y1={geo.baseY}
          y2={geo.baseY}
          stroke="rgb(216 205 187 / 0.28)"
        />
        {geo.xTicks.map((t) => (
          <g key={`x-${t}`}>
            <line
              x1={geo.x(t)}
              x2={geo.x(t)}
              y1={geo.baseY}
              y2={geo.baseY + 5}
              stroke="rgb(216 205 187 / 0.28)"
            />
            <text
              x={geo.x(t)}
              y={geo.baseY + 18}
              textAnchor="middle"
              fontSize="10.5"
              fill="#A69D8B"
              fontFamily="var(--font-jetbrains-mono), monospace"
            >
              {Math.round(t)}
            </text>
          </g>
        ))}
        <text
          x={W - M.right}
          y={geo.baseY + 32}
          textAnchor="end"
          fontSize="9.5"
          fill="#A69D8B"
          fontFamily="var(--font-jetbrains-mono), monospace"
          letterSpacing="0.08em"
        >
          MI FROM TRAILHEAD
        </text>

        {/* waypoint ticks along the baseline */}
        {trail.waypoints.map((w) => (
          <line
            key={w.id}
            x1={geo.x(Math.min(w.mileMarker, geo.maxMi))}
            x2={geo.x(Math.min(w.mileMarker, geo.maxMi))}
            y1={geo.baseY - 6}
            y2={geo.baseY - 1}
            stroke={WAYPOINT_META[w.kind].color}
            strokeWidth="2"
            opacity="0.85"
          >
            <title>{`${w.name}: MI ${w.mileMarker.toFixed(1)}`}</title>
          </line>
        ))}

        {/* area + line */}
        <path d={geo.area} fill={`url(#${gradientId})`} />
        <path
          d={geo.line}
          fill="none"
          stroke="#E8622C"
          strokeWidth="2.25"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* min / max elevation callouts */}
        <g pointerEvents="none">
          <circle
            cx={geo.x(maxPt.distanceFromStartMi)}
            cy={geo.y(maxPt.elevationFt)}
            r="3.5"
            fill="#EDE6DA"
            stroke="#15181C"
            strokeWidth="1.5"
          />
          <text
            x={clampX(geo.x(maxPt.distanceFromStartMi))}
            y={geo.y(maxPt.elevationFt) - 10}
            textAnchor="middle"
            fontSize="11"
            fill="#EDE6DA"
            fontFamily="var(--font-jetbrains-mono), monospace"
          >
            ▲ {fmtFt(geo.maxE)} FT
          </text>
          <circle
            cx={geo.x(minPt.distanceFromStartMi)}
            cy={geo.y(minPt.elevationFt)}
            r="3.5"
            fill="#A69D8B"
            stroke="#15181C"
            strokeWidth="1.5"
          />
          <text
            x={clampX(geo.x(minPt.distanceFromStartMi))}
            y={geo.y(minPt.elevationFt) + 18}
            textAnchor="middle"
            fontSize="11"
            fill="#A69D8B"
            fontFamily="var(--font-jetbrains-mono), monospace"
          >
            ▼ {fmtFt(geo.minE)} FT
          </text>
        </g>

        {/* hover cursor + tooltip */}
        {hp && tooltip ? (
          <g pointerEvents="none">
            <line
              x1={tooltip.cx}
              x2={tooltip.cx}
              y1={M.top}
              y2={geo.baseY}
              stroke="#EDE6DA"
              strokeOpacity="0.45"
              strokeDasharray="3 4"
            />
            <circle
              cx={tooltip.cx}
              cy={tooltip.cy}
              r="5"
              fill="#E8622C"
              stroke="#EDE6DA"
              strokeWidth="1.75"
            />
            <g transform={`translate(${tooltip.tx} ${tooltip.ty})`}>
              <rect
                width={tooltip.boxW}
                height={tooltip.boxH}
                rx="6"
                fill="#101215"
                stroke="rgb(216 205 187 / 0.28)"
              />
              <text
                x="12"
                y="19"
                fontSize="12"
                fill="#F07B49"
                fontFamily="var(--font-jetbrains-mono), monospace"
              >
                MI {hp.distanceFromStartMi.toFixed(1)}
              </text>
              <text
                x="12"
                y="36"
                fontSize="12"
                fill="#EDE6DA"
                fontFamily="var(--font-jetbrains-mono), monospace"
              >
                {fmtFt(hp.elevationFt)} FT
              </text>
            </g>
          </g>
        ) : null}
      </svg>

      <p className="mt-2 text-[11px] text-sand-dim">
        Hover or scrub the chart to place a marker on the map. Hover the route
        line on the map to move the cursor here.
      </p>
    </section>
  );
}
