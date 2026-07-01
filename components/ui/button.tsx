import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-ember text-basalt-deep border border-ember hover:bg-ember-bright hover:border-ember-bright",
  outline:
    "bg-transparent text-bone border border-edge-strong hover:border-ember hover:text-ember-bright",
  ghost: "bg-transparent text-sand border border-transparent hover:text-bone",
};

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3.5 text-base",
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded font-display font-semibold uppercase tracking-[0.12em] transition-colors duration-150 ease-out";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  href?: string;
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

export function Button({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const classes = `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
