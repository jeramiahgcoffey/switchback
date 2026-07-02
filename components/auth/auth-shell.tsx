import type { ReactNode } from "react";

/**
 * Presentational wrapper for the auth pages: topo-textured hero band, centered
 * narrow column. Server component (no client state).
 */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="absolute inset-0 bg-topo" />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-basalt via-transparent to-transparent"
      />
      <div className="relative mx-auto flex min-h-[calc(100vh-8rem)] max-w-md flex-col justify-center px-4 py-16 sm:px-6">
        <p className="readout text-xs text-sand-dim">SWITCHBACK ACCOUNT</p>
        <h1 className="heading-display mt-2 text-4xl sm:text-5xl">{title}</h1>
        <p className="mt-3 text-sm text-sand">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

/**
 * Only allow same-origin relative paths as a post-auth redirect target, so a
 * crafted `?redirect=` can't bounce users to an external site.
 *
 * Resolve against a fixed placeholder origin and require the result to stay on
 * it. This rejects absolute URLs ("http://evil.com"), protocol-relative ones
 * ("//evil.com"), and backslash tricks ("/\evil.com") that browsers normalize
 * to off-site navigations. Returns only the path portion, never a full URL.
 */
export function safeRedirect(value: string | undefined): string {
  if (!value) return "/";
  try {
    const base = "http://localhost";
    const url = new URL(value, base);
    if (url.origin === base) return url.pathname + url.search + url.hash;
  } catch {
    // malformed target -> fall through to the default
  }
  return "/";
}
