import type { ReadinessStatus } from "@/lib/types";
import { STATUS_META } from "@/components/garage/gear-meta";

/**
 * One consistent stroked icon style for the Garage: 1.8px stroke, round
 * caps/joins, sized via a `size` prop. Status glyphs always pair a shape
 * with a color so state never reads as color alone.
 */

interface IconProps {
  size?: number;
  className?: string;
}

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function IconCheck({ size = 14, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden className={className}>
      <path d="M3 8.5l3.2 3.2L13 4.5" {...STROKE} />
    </svg>
  );
}

export function IconAlert({ size = 14, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden className={className}>
      <path d="M8 2.2L14.6 13.4H1.4L8 2.2z" {...STROKE} />
      <path d="M8 6.4v3" {...STROKE} />
      <circle cx="8" cy="11.6" r="0.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconX({ size = 14, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden className={className}>
      <path d="M4 4l8 8M12 4l-8 8" {...STROKE} />
    </svg>
  );
}

export function IconChevronDown({ size = 14, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden className={className}>
      <path d="M3.5 6l4.5 4.5L12.5 6" {...STROKE} />
    </svg>
  );
}

/** Status glyph: shape + reserved status color, labeled for screen readers. */
export function StatusGlyph({
  status,
  size = 14,
  className = "",
}: {
  status: ReadinessStatus;
  size?: number;
  className?: string;
}) {
  const meta = STATUS_META[status];
  const Icon = status === "pass" ? IconCheck : status === "warn" ? IconAlert : IconX;
  return (
    <span
      role="img"
      aria-label={meta.label}
      title={meta.label}
      className={`inline-flex items-center justify-center ${meta.text} ${className}`}
    >
      <Icon size={size} />
    </span>
  );
}
