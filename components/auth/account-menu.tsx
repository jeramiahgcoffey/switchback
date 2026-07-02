"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

/**
 * Header account control. Reactive to Better Auth's session store: shows a
 * "Sign in" link when signed out, and a dropdown (email + Sign out) when signed
 * in. Renders a stable-width skeleton while the session resolves to avoid a
 * layout shift in the header.
 */
export function AccountMenu() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (isPending) {
    return (
      <div
        className="h-9 w-[4.5rem] animate-pulse rounded bg-gunmetal-light/50"
        aria-hidden
      />
    );
  }

  if (!session) {
    return (
      <Link
        href="/sign-in"
        className="rounded border border-edge-strong px-3 py-2 font-display text-sm font-semibold uppercase tracking-[0.12em] text-sand transition-colors duration-150 ease-out hover:border-ember hover:text-ember-bright"
      >
        Sign in
      </Link>
    );
  }

  const user = session.user;
  const displayName = user.name?.trim() || user.email;
  const initial = (displayName[0] ?? "?").toUpperCase();

  async function onSignOut() {
    setSigningOut(true);
    await authClient.signOut();
    setSigningOut(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded border border-edge-strong px-2 py-1.5 transition-colors duration-150 ease-out hover:border-ember"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ember text-xs font-bold text-basalt-deep">
          {initial}
        </span>
        <span className="hidden max-w-[9rem] truncate font-display text-sm font-semibold uppercase tracking-[0.1em] text-sand sm:inline">
          {displayName}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="card-surface absolute right-0 top-full z-50 mt-2 w-60 p-1 shadow-xl"
        >
          <div className="border-b border-edge px-3 py-2.5">
            <p className="truncate text-sm text-bone">
              {user.name?.trim() || "Signed in"}
            </p>
            <p className="truncate text-xs text-sand-dim">{user.email}</p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={onSignOut}
            disabled={signingOut}
            className="mt-1 w-full rounded px-3 py-2 text-left font-display text-sm font-semibold uppercase tracking-[0.12em] text-sand transition-colors duration-150 ease-out hover:bg-gunmetal-light hover:text-ember-bright disabled:opacity-50"
          >
            {signingOut ? "Signing out" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
