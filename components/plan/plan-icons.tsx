/**
 * Trip Wizard icon set: one consistent stroked style (1.6px stroke,
 * round caps, currentColor) so waypoint flags, resupply chips, and gear
 * category headers all read as the same instrument family.
 */
import type { GearCategory } from "@/lib/types";

function Svg({
  size = 16,
  className = "",
  children,
  label,
}: {
  size?: number;
  className?: string;
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      {children}
    </svg>
  );
}

export function TentIcon(props: { size?: number; className?: string }) {
  return (
    <Svg {...props}>
      <path d="M12 4.5 2.8 19.5h18.4L12 4.5Z" />
      <path d="M12 12.5 8.4 19.5" />
      <path d="M12 12.5l3.6 7" />
    </Svg>
  );
}

export function FuelIcon(props: { size?: number; className?: string }) {
  return (
    <Svg {...props}>
      <path d="M5.5 20V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v14" />
      <path d="M4 20h11" />
      <path d="M8 7.5h3v3.5H8z" />
      <path d="M13.5 11h1.8a1.5 1.5 0 0 1 1.5 1.5v4.2a1.4 1.4 0 0 0 2.8 0V9.5L17.8 7.5" />
    </Svg>
  );
}

export function DropIcon(props: { size?: number; className?: string }) {
  return (
    <Svg {...props}>
      <path d="M12 3.5C8.4 8.6 6.2 11.9 6.2 14.8a5.8 5.8 0 0 0 11.6 0c0-2.9-2.2-6.2-5.8-11.3Z" />
    </Svg>
  );
}

export function FlagIcon(props: { size?: number; className?: string }) {
  return (
    <Svg {...props}>
      <path d="M6 21V4" />
      <path d="M6 4h11.5l-3 3.75 3 3.75H6" />
    </Svg>
  );
}

export function AlertIcon(props: { size?: number; className?: string }) {
  return (
    <Svg {...props}>
      <path d="M12 4 2.8 19.5h18.4L12 4Z" />
      <path d="M12 10v4" />
      <path d="M12 17.2v.05" />
    </Svg>
  );
}

export function SaveTickIcon(props: { size?: number; className?: string }) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 12.2 2.4 2.4 4.6-5" />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* Gear category glyphs                                                */
/* ------------------------------------------------------------------ */

const CATEGORY_GLYPHS: Record<GearCategory, React.ReactNode> = {
  // Bow shackle
  recovery: (
    <>
      <path d="M7.5 12.5V9.5a4.5 4.5 0 0 1 9 0v3" />
      <path d="M5.5 12.5h4M14.5 12.5h4" />
      <path d="M8 12.5a4 5.5 0 0 0 8 0" />
    </>
  ),
  camp: (
    <>
      <path d="M12 4.5 2.8 19.5h18.4L12 4.5Z" />
      <path d="M12 12.5 8.4 19.5" />
      <path d="M12 12.5l3.6 7" />
    </>
  ),
  // Camp pot with steam
  kitchen: (
    <>
      <path d="M5 11h14v4.5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V11Z" />
      <path d="M3 11h18" />
      <path d="M9 7.5V6M12 7.5V6M15 7.5V6" />
    </>
  ),
  water: (
    <path d="M12 3.5C8.4 8.6 6.2 11.9 6.2 14.8a5.8 5.8 0 0 0 11.6 0c0-2.9-2.2-6.2-5.8-11.3Z" />
  ),
  // Radio waves + antenna
  comms: (
    <>
      <path d="M12 21v-8.5" />
      <circle cx="12" cy="11" r="1.4" />
      <path d="M8.5 7.8a5 5 0 0 1 7 0" />
      <path d="M5.8 5a8.8 8.8 0 0 1 12.4 0" />
    </>
  ),
  "tools-spares": (
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" />
  ),
  // Shield cross
  safety: (
    <>
      <path d="M12 3l7 2.8v5c0 4.4-2.9 7.4-7 10.2-4.1-2.8-7-5.8-7-10.2v-5L12 3Z" />
      <path d="M12 8.5v6M9 11.5h6" />
    </>
  ),
  // Duffel
  personal: (
    <>
      <path d="M4 9.5h16V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9.5Z" />
      <path d="M9 9.5V7.5a3 3 0 0 1 6 0v2" />
    </>
  ),
};

export function CategoryIcon({
  category,
  size = 16,
  className = "",
}: {
  category: GearCategory;
  size?: number;
  className?: string;
}) {
  return (
    <Svg size={size} className={className}>
      {CATEGORY_GLYPHS[category]}
    </Svg>
  );
}

export const CATEGORY_LABEL: Record<GearCategory, string> = {
  recovery: "Recovery",
  camp: "Camp",
  kitchen: "Kitchen",
  water: "Water",
  comms: "Comms",
  "tools-spares": "Tools & Spares",
  safety: "Safety",
  personal: "Personal",
};
