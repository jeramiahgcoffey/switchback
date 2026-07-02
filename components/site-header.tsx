"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountMenu } from "@/components/auth/account-menu";

const NAV = [
  { href: "/trails", label: "Trails" },
  { href: "/plan", label: "Plan a Trip" },
  { href: "/garage", label: "Garage" },
] as const;

function Wordmark() {
  return (
    <Link href="/" className="group flex items-center gap-2.5">
      {/* Switchback mark: a climbing route with two hairpins. */}
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        aria-hidden
        className="shrink-0"
      >
        <rect
          x="1"
          y="1"
          width="26"
          height="26"
          rx="5"
          className="stroke-edge-strong"
          strokeWidth="1.5"
        />
        <path
          d="M6 22h10a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h13"
          className="stroke-ember"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeDasharray="4 3"
        />
        <circle cx="6" cy="22" r="2" className="fill-sand" />
        <circle cx="22" cy="10" r="2" className="fill-ember" />
      </svg>
      <span className="heading-display text-xl leading-none transition-colors duration-150 group-hover:text-ember-bright">
        Switchback
      </span>
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-50 border-b border-edge bg-basalt/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Wordmark />
        <div className="flex items-center gap-2 sm:gap-4">
          <nav aria-label="Primary">
            <ul className="flex items-center gap-1 sm:gap-2">
              {NAV.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`rounded px-2.5 py-2 font-display text-sm font-semibold uppercase tracking-[0.14em] transition-colors duration-150 ease-out sm:px-3 ${
                        active
                          ? "text-ember-bright"
                          : "text-sand-dim hover:text-bone"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
