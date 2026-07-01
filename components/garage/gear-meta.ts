import type { GearCategory, ReadinessStatus } from "@/lib/types";

/**
 * Categorical palette for the payload calculator's stacked weight-budget bar
 * and gear legend. Eight hues in a FIXED order (the order is the CVD-safety
 * mechanism — never re-sort or cycle it): validated against the gunmetal
 * surface (#1E2126) with the dataviz six-checks validator — all checks pass,
 * worst adjacent CVD ΔE 18.4 (target ≥ 12). Segments additionally carry 2px
 * surface gaps and a swatch-labeled legend, so identity is never color-alone.
 */
export const GEAR_CATEGORY_ORDER: GearCategory[] = [
  "recovery",
  "safety",
  "personal",
  "comms",
  "camp",
  "kitchen",
  "tools-spares",
  "water",
];

export const GEAR_CATEGORY_META: Record<
  GearCategory,
  { label: string; color: string }
> = {
  recovery: { label: "Recovery", color: "#E8622C" },
  safety: { label: "Safety", color: "#D55181" },
  personal: { label: "Personal", color: "#B58434" },
  comms: { label: "Comms", color: "#9085E9" },
  camp: { label: "Camp", color: "#5F9E4A" },
  kitchen: { label: "Kitchen", color: "#C98500" },
  "tools-spares": { label: "Tools & spares", color: "#199E70" },
  water: { label: "Water", color: "#3987E5" },
};

/** Verdict presentation — status colors are reserved and always ship with an icon + label. */
export const VERDICT_META = {
  go: {
    label: "Go",
    badge: "border-sage/50 bg-sage/15 text-sage-bright",
    text: "text-sage-bright",
    dot: "bg-sage",
  },
  caution: {
    label: "Caution",
    badge: "border-amber/50 bg-amber/15 text-amber",
    text: "text-amber",
    dot: "bg-amber",
  },
  "no-go": {
    label: "No-Go",
    badge: "border-rust/60 bg-rust/20 text-rust-bright",
    text: "text-rust-bright",
    dot: "bg-rust",
  },
} as const;

export const STATUS_META: Record<
  ReadinessStatus,
  { label: string; text: string }
> = {
  pass: { label: "Pass", text: "text-sage-bright" },
  warn: { label: "Warn", text: "text-amber" },
  fail: { label: "Fail", text: "text-rust-bright" },
};

/** Payload thresholds for the weight-budget bar states. */
export const PAYLOAD_WARN_PCT = 85;
