"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import type {
  ShareExpiryDays,
  SharedTripOwnerDTO,
} from "@/lib/shared-trip";
import type { TripPlan } from "@/lib/types";
import { Button } from "@/components/ui/button";

function formatDate(value: string | null): string {
  if (!value) return "No expiration";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function shareStatus(share: SharedTripOwnerDTO): string {
  if (share.revokedAt) return "Revoked";
  if (share.expiresAt && new Date(share.expiresAt).getTime() <= Date.now()) {
    return "Expired";
  }
  return "Live";
}

async function responseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === "string") return body.error;
  } catch {
    // Fall through to the stable message below.
  }
  return "Sharing is temporarily unavailable";
}

function ShareLinkRow({
  share,
  onCopy,
  onRevoke,
  revoking,
}: {
  share: SharedTripOwnerDTO;
  onCopy: (shareId: string) => void;
  onRevoke: (shareId: string) => void;
  revoking: boolean;
}) {
  const status = shareStatus(share);
  const live = status === "Live";
  return (
    <li className="rounded border border-edge bg-basalt-deep/60 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                live ? "bg-sage-bright" : "bg-sand-dim"
              }`}
              aria-hidden
            />
            <strong className="font-display text-sm uppercase tracking-[0.1em] text-bone">
              {status}
            </strong>
            <span className="font-mono text-[0.65rem] text-sand-dim">
              {share.shareId.slice(0, 8).toUpperCase()}
            </span>
          </div>
          <p className="mt-1 text-xs text-sand-dim">
            {share.viewCount} view{share.viewCount === 1 ? "" : "s"} ·{" "}
            {share.expiresAt ? `Expires ${formatDate(share.expiresAt)}` : "No expiration"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {live ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => onCopy(share.shareId)}>
                Copy
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={revoking}
                onClick={() => onRevoke(share.shareId)}
                className="text-rust-bright disabled:opacity-50"
              >
                {revoking ? "Revoking" : "Revoke"}
              </Button>
            </>
          ) : null}
        </div>
      </div>
      {live ? (
        <Link
          href={`/share/${share.shareId}`}
          target="_blank"
          rel="noreferrer"
          className="mt-2 block truncate font-mono text-[0.7rem] text-ember-bright hover:underline"
        >
          /share/{share.shareId}
        </Link>
      ) : null}
    </li>
  );
}

export function ShareTripPanel({
  plan,
  onClose,
}: {
  plan: TripPlan;
  onClose: () => void;
}) {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [shares, setShares] = useState<SharedTripOwnerDTO[]>([]);
  const [expiresInDays, setExpiresInDays] = useState<ShareExpiryDays>(30);
  const [includeFieldNotes, setIncludeFieldNotes] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const hasFieldNotes = Object.values(plan.fieldNotes ?? {}).some(Boolean);

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    fetch(`/api/shared-trips?tripId=${encodeURIComponent(plan.id)}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(await responseError(response));
        return response.json() as Promise<{ shares: SharedTripOwnerDTO[] }>;
      })
      .then(({ shares: nextShares }) => setShares(nextShares))
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
          return;
        }
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Sharing is temporarily unavailable",
        );
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [plan.id, session]);

  async function copyLink(shareId: string) {
    const url = new URL(`/share/${shareId}`, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(shareId);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("Copy was blocked. Open the link and copy it from the address bar.");
    }
  }

  async function createLink() {
    setCreating(true);
    setError(null);
    try {
      const response = await fetch("/api/shared-trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, expiresInDays, includeFieldNotes }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      const body = (await response.json()) as { share: SharedTripOwnerDTO };
      setShares((previous) => [
        body.share,
        ...previous.filter((share) => share.shareId !== body.share.shareId),
      ]);
      await copyLink(body.share.shareId);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Sharing is temporarily unavailable",
      );
    } finally {
      setCreating(false);
    }
  }

  async function revokeLink(shareId: string) {
    setRevoking(shareId);
    setError(null);
    try {
      const response = await fetch(`/api/shared-trips/${shareId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(await responseError(response));
      setShares((previous) =>
        previous.map((share) =>
          share.shareId === shareId
            ? { ...share, revokedAt: new Date().toISOString() }
            : share,
        ),
      );
    } catch (revokeError) {
      setError(
        revokeError instanceof Error
          ? revokeError.message
          : "Sharing is temporarily unavailable",
      );
    } finally {
      setRevoking(null);
    }
  }

  const redirect = encodeURIComponent(`/plan/packet/${plan.id}`);

  return (
    <section
      id="share-trip-panel"
      aria-labelledby="share-trip-heading"
      className="mx-auto mt-3 w-[calc(100%-2rem)] max-w-6xl rounded-lg border border-ember/35 bg-gunmetal shadow-2xl print:hidden"
    >
      <header className="flex items-start justify-between gap-4 border-b border-edge px-4 py-4 sm:px-5">
        <div>
          <p className="stat-label text-ember-bright">Dispatch permit</p>
          <h2 id="share-trip-heading" className="heading-display mt-1 text-2xl">
            Share this trip brief
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-sand-dim">
            Creates a frozen, read-only copy. Anyone with the link can open and
            print it; your account identity is never included.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded px-2 py-1 text-xl text-sand-dim hover:bg-basalt hover:text-bone"
          aria-label="Close sharing panel"
        >
          ×
        </button>
      </header>

      {sessionPending ? (
        <div className="h-40 animate-pulse bg-basalt/40" aria-label="Checking account" />
      ) : !session ? (
        <div className="px-4 py-6 sm:px-5">
          <p className="max-w-xl text-sm leading-relaxed text-sand">
            Sign in before publishing a link. This ties revocation and link
            history to your account while leaving the public brief anonymous.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button href={`/sign-in?redirect=${redirect}`}>Sign in to share</Button>
            <Button href={`/sign-up?redirect=${redirect}`} variant="outline">
              Create account
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-0 lg:grid-cols-[minmax(0,0.9fr)_minmax(20rem,1.1fr)]">
          <div className="border-b border-edge px-4 py-5 lg:border-r lg:border-b-0 sm:px-5">
            <label className="stat-label block" htmlFor="share-expiry">
              Link expiration
            </label>
            <select
              id="share-expiry"
              value={expiresInDays ?? "never"}
              onChange={(event) =>
                setExpiresInDays(
                  event.target.value === "never"
                    ? null
                    : (Number(event.target.value) as ShareExpiryDays),
                )
              }
              className="mt-2 w-full rounded border border-edge-strong bg-basalt-deep px-3 py-2.5 text-sm text-bone outline-none focus:border-ember"
            >
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value="never">No expiration</option>
            </select>

            <label className="mt-5 flex items-start gap-3 text-sm text-sand">
              <input
                type="checkbox"
                checked={includeFieldNotes}
                disabled={!hasFieldNotes}
                onChange={(event) => setIncludeFieldNotes(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-ember disabled:opacity-40"
              />
              <span>
                Include crew and emergency details
                <small className="mt-1 block text-xs leading-relaxed text-sand-dim">
                  Off by default. These fields may contain phone, medical,
                  permit, or meetup information.
                </small>
              </span>
            </label>

            {error ? (
              <p
                role="alert"
                className="mt-4 rounded border border-rust/40 bg-rust/10 px-3 py-2 text-xs text-rust-bright"
              >
                {error}
              </p>
            ) : null}
            {copied ? (
              <p role="status" className="mt-4 text-xs text-sage-bright">
                Link copied. Dispatch {copied.slice(0, 8).toUpperCase()} is live.
              </p>
            ) : null}

            <Button
              type="button"
              onClick={createLink}
              disabled={creating}
              className="mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? "Publishing brief" : "Create share link"}
            </Button>
          </div>

          <div className="px-4 py-5 sm:px-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="stat-label">Link log</p>
                <p className="mt-1 text-xs text-sand-dim">
                  View counts contain no viewer identity.
                </p>
              </div>
              <span className="font-mono text-xs text-sand-dim">
                {shares.length.toString().padStart(2, "0")} issued
              </span>
            </div>

            {loading ? (
              <div className="mt-4 h-24 animate-pulse rounded bg-basalt-deep" />
            ) : shares.length ? (
              <ul className="mt-4 space-y-2">
                {shares.map((share) => (
                  <ShareLinkRow
                    key={share.shareId}
                    share={share}
                    onCopy={copyLink}
                    onRevoke={revokeLink}
                    revoking={revoking === share.shareId}
                  />
                ))}
              </ul>
            ) : (
              <div className="mt-4 rounded border border-dashed border-edge-strong px-4 py-7 text-center">
                <p className="text-sm text-sand">No dispatch links yet.</p>
                <p className="mt-1 text-xs text-sand-dim">
                  Create one when the packet is ready for the crew.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
