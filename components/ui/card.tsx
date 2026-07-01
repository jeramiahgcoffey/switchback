import type { ReactNode } from "react";

/**
 * Sturdy card per the design language: 8px radius, 1px sand-tone border,
 * gunmetal surface. Pass `lift` for the 180ms hover lift.
 */
export function Card({
  lift = false,
  className = "",
  children,
}: {
  lift?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`card-surface overflow-hidden ${lift ? "hover-lift" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

/** Photo top with gradient scrim. Drop an <img> or bg element inside. */
export function CardMedia({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`relative ${className}`}>
      {children}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-gunmetal via-transparent to-transparent"
      />
    </div>
  );
}

export function CardBody({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={`p-4 sm:p-5 ${className}`}>{children}</div>;
}
