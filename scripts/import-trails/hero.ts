/**
 * Hero image generator: a dusk-palette SVG ridgeline built from the trail's
 * OWN elevation profile, so every card art is real data. Matches the style of
 * the hand-made seed heroes (gradient sky, ember glow, grain).
 */
import type { Trail } from "../../lib/types";

const W = 1200;
const H = 800;

interface Palette {
  skyTop: string;
  skyMid: string;
  skyLow: string;
  ridges: string[];
}

const PALETTES: Record<string, Palette> = {
  alpine: {
    skyTop: "#161A20",
    skyMid: "#25303E",
    skyLow: "#4A5A6E",
    ridges: ["#3A4656", "#2C3644", "#1F2733", "#151B24"],
  },
  desert: {
    skyTop: "#1A1612",
    skyMid: "#3E2E25",
    skyLow: "#7A4E33",
    ridges: ["#5C3D2E", "#452E24", "#30211B", "#1E1613"],
  },
  forest: {
    skyTop: "#141A16",
    skyMid: "#25352B",
    skyLow: "#4A6553",
    ridges: ["#39493E", "#2B3830", "#1E2823", "#141B17"],
  },
};

function paletteFor(trail: Trail): Palette {
  if (trail.terrain.includes("desert") || trail.terrain.includes("slickrock") || trail.terrain.includes("sand")) {
    return PALETTES.desert;
  }
  if (trail.terrain.includes("forest") && !trail.terrain.includes("alpine")) {
    return PALETTES.forest;
  }
  return PALETTES.alpine;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Ridge path from the elevation profile, vertically placed per layer. */
function ridgePath(elev: number[], baseY: number, amp: number): string {
  const min = Math.min(...elev);
  const max = Math.max(...elev);
  const span = Math.max(1, max - min);
  const step = W / (elev.length - 1);
  const pts = elev.map((e, i) => {
    const x = Math.round(i * step);
    const y = Math.round(baseY - ((e - min) / span) * amp);
    return `${x},${y}`;
  });
  return `M0,${H} L${pts.join(" L")} L${W},${H} Z`;
}

/** Downsample + smooth a profile for a background layer. */
function simplify(elev: number[], every: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < elev.length; i += every) out.push(elev[i]);
  if ((elev.length - 1) % every !== 0) out.push(elev[elev.length - 1]);
  return out;
}

export function heroSvg(trail: Trail): string {
  const p = paletteFor(trail);
  const h = hash(trail.slug);
  const elev = trail.track.map((t) => t.elevationFt);
  const sunX = 240 + (h % 720);
  const sunY = 200 + ((h >> 4) % 160);
  const seed = (h % 97) + 1;

  const layers = [
    { elev: simplify(elev, 8), baseY: 560, amp: 300, fill: p.ridges[0], opacity: 0.9 },
    { elev: simplify(elev, 4), baseY: 640, amp: 260, fill: p.ridges[1], opacity: 0.95 },
    { elev: simplify(elev, 2), baseY: 720, amp: 220, fill: p.ridges[2], opacity: 1 },
    { elev, baseY: 800, amp: 190, fill: p.ridges[3], opacity: 1 },
  ];

  const ridges = layers
    .map(
      (l) =>
        `  <path d="${ridgePath(l.elev, l.baseY, l.amp)}" fill="${l.fill}" fill-opacity="${l.opacity}"/>`,
    )
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${p.skyTop}"/>
      <stop offset="0.55" stop-color="${p.skyMid}"/>
      <stop offset="1" stop-color="${p.skyLow}"/>
    </linearGradient>
    <radialGradient id="glow" cx="${(sunX / W).toFixed(2)}" cy="${(sunY / H).toFixed(2)}" r="0.5">
      <stop offset="0" stop-color="#D9A441" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#D9A441" stop-opacity="0"/>
    </radialGradient>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${seed}" stitchTiles="stitch"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.93 0 0 0 0 0.9 0 0 0 0 0.85 0 0 0 0.06 0"/>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <circle cx="${sunX}" cy="${sunY}" r="56" fill="#D9A441" opacity="0.85"/>
${ridges}
  <rect width="${W}" height="${H}" filter="url(#grain)"/>
</svg>
`;
}
