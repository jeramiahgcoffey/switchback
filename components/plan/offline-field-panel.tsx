"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
  DEPARTURE_CHECKS,
  countCompleted,
  fieldKitPaths,
  type OfflineFieldState,
  type OfflineWorkerRequest,
  type OfflineWorkerResponse,
} from "@/lib/offline-field";

const WORKER_TIMEOUT_MS = 12_000;

function subscribeToConnection(update: () => void) {
  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  return () => {
    window.removeEventListener("online", update);
    window.removeEventListener("offline", update);
  };
}

const emptySubscribe = () => () => {};
const getOnline = () => navigator.onLine;
const getServerOnline = () => true;
const getWorkerSupport = () => "serviceWorker" in navigator;
const getServerWorkerSupport = () => false;

function formatTimestamp(value: string | null): string {
  if (!value) return "Not downloaded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function sendWorkerMessage(
  request: OfflineWorkerRequest,
): Promise<OfflineWorkerResponse> {
  if (!("serviceWorker" in navigator)) {
    return { ok: false, error: "Offline storage is not supported in this browser." };
  }

  let readyTimeout = 0;
  const registration = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_resolve, reject) => {
      readyTimeout = window.setTimeout(
        () => reject(new Error("Offline storage is still starting.")),
        WORKER_TIMEOUT_MS,
      );
    }),
  ]).finally(() => window.clearTimeout(readyTimeout));
  const worker = registration.active ?? registration.waiting ?? registration.installing;
  if (!worker) return { ok: false, error: "Offline storage is still starting." };

  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timeout = window.setTimeout(
      () => resolve({ ok: false, error: "Offline storage timed out." }),
      WORKER_TIMEOUT_MS,
    );
    channel.port1.onmessage = (event: MessageEvent<OfflineWorkerResponse>) => {
      window.clearTimeout(timeout);
      resolve(event.data);
    };
    worker.postMessage(request, [channel.port2]);
  });
}

export function OfflineFieldPanel({
  packetPath,
  trailSlug,
  sourceUpdatedAt,
  packingTotal,
  packingComplete,
  fieldState,
  onFieldStateChange,
  onClose,
}: {
  packetPath: string;
  trailSlug: string;
  sourceUpdatedAt: string;
  packingTotal: number;
  packingComplete: number;
  fieldState: OfflineFieldState;
  onFieldStateChange: (next: OfflineFieldState) => void;
  onClose: () => void;
}) {
  const online = useSyncExternalStore(
    subscribeToConnection,
    getOnline,
    getServerOnline,
  );
  const supported = useSyncExternalStore(
    emptySubscribe,
    getWorkerSupport,
    getServerWorkerSupport,
  );
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const paths = useMemo(
    () => fieldKitPaths(packetPath, trailSlug),
    [packetPath, trailSlug],
  );
  const departureComplete = countCompleted(
    fieldState.departureChecks,
    DEPARTURE_CHECKS.map((item) => item.id),
  );

  useEffect(() => {
    if (!supported || !fieldState.cachedAt) return;
    let cancelled = false;
    sendWorkerMessage({ action: "STATUS_FIELD_KIT", paths })
      .then((response) => {
        if (!cancelled && response.ok && response.cached === false) {
          onFieldStateChange({ ...fieldState, cachedAt: null });
        }
      })
      .catch(() => {
        // Cache status is best-effort; the explicit refresh action reports errors.
      });
    return () => {
      cancelled = true;
    };
  }, [fieldState, onFieldStateChange, paths, supported]);

  async function saveFieldKit() {
    setWorking(true);
    setError(null);
    try {
      const response = await sendWorkerMessage({
        action: "CACHE_FIELD_KIT",
        paths,
      });
      if (!response.ok) throw new Error(response.error || "Download failed.");
      const timestamp = new Date().toISOString();
      onFieldStateChange({
        ...fieldState,
        cachedAt: timestamp,
        updatedAt: timestamp,
      });
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Download failed.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function removeFieldKit() {
    setWorking(true);
    setError(null);
    try {
      const response = await sendWorkerMessage({
        action: "DELETE_FIELD_KIT",
        paths,
      });
      if (!response.ok) throw new Error(response.error || "Removal failed.");
      onFieldStateChange({ ...fieldState, cachedAt: null });
    } catch (removeError) {
      setError(
        removeError instanceof Error ? removeError.message : "Removal failed.",
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <section
      id="offline-field-panel"
      aria-labelledby="offline-field-heading"
      className="mx-auto mt-3 w-[calc(100%-2rem)] max-w-6xl overflow-hidden rounded-lg border border-sage/45 bg-gunmetal shadow-2xl print:hidden"
    >
      <header className="flex items-start justify-between gap-4 border-b border-edge px-4 py-4 sm:px-5">
        <div>
          <p className="stat-label text-sage-bright">Field cache / device only</p>
          <h2 id="offline-field-heading" className="heading-display mt-1 text-2xl">
            Offline field mode
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-sand-dim">
            Downloads this packet, its frozen rig and loadout, the selected trail
            summary, and the app shell to this device.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded px-2 py-1 text-xl text-sand-dim hover:bg-basalt hover:text-bone"
          aria-label="Close offline field panel"
        >
          ×
        </button>
      </header>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.72fr)]">
        <div className="border-b border-edge px-4 py-5 lg:border-r lg:border-b-0 sm:px-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p className="stat-label">Connection</p>
              <strong className={online ? "text-sage-bright" : "text-ember-bright"}>
                {online ? "Online" : "Offline"}
              </strong>
            </div>
            <div>
              <p className="stat-label">Packet copy</p>
              <strong className="text-bone">
                {fieldState.cachedAt ? "On device" : "Not saved"}
              </strong>
            </div>
            <div>
              <p className="stat-label">Packed</p>
              <strong className="text-bone">
                {packingComplete}/{packingTotal}
              </strong>
            </div>
            <div>
              <p className="stat-label">Departure</p>
              <strong className="text-bone">
                {departureComplete}/{DEPARTURE_CHECKS.length}
              </strong>
            </div>
          </div>

          <div className="mt-5 rounded border border-edge bg-basalt-deep/55 p-3 text-xs leading-relaxed text-sand-dim">
            <p>
              <strong className="text-sand">Saved:</strong>{" "}
              {formatTimestamp(fieldState.cachedAt)}
            </p>
            <p className="mt-1">
              <strong className="text-sand">Packet source:</strong>{" "}
              {formatTimestamp(sourceUpdatedAt)}
            </p>
          </div>

          {error ? (
            <p
              role="alert"
              className="mt-4 rounded border border-rust/40 bg-rust/10 px-3 py-2 text-xs text-rust-bright"
            >
              {error}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={saveFieldKit}
              disabled={working || !supported || !online}
              className="disabled:cursor-not-allowed disabled:opacity-45"
            >
              {working
                ? "Working"
                : fieldState.cachedAt
                  ? "Refresh offline copy"
                  : "Save field kit offline"}
            </Button>
            {fieldState.cachedAt ? (
              <Button
                type="button"
                variant="outline"
                onClick={removeFieldKit}
                disabled={working}
              >
                Remove downloaded copy
              </Button>
            ) : null}
          </div>
          {!supported ? (
            <p className="mt-3 text-xs text-sand-dim">
              This browser does not expose service-worker storage.
            </p>
          ) : !online ? (
            <p className="mt-3 text-xs text-sand-dim">
              Existing checks remain editable. Reconnect before refreshing the
              downloaded packet.
            </p>
          ) : null}
        </div>

        <aside className="px-4 py-5 sm:px-5">
          <p className="stat-label text-ember-bright">Boundary</p>
          <h3 className="heading-display mt-1 text-xl">Planning, not navigation</h3>
          <p className="mt-2 text-xs leading-relaxed text-sand-dim">
            Offline Field Mode does not download map tiles, live conditions,
            closures, turn-by-turn directions, or emergency communications.
            Carry current offline maps and an independent communication plan.
          </p>
          <p className="mt-4 border-l-2 border-sage/60 pl-3 text-xs leading-relaxed text-sand">
            Packing and departure checks persist locally as you work, even when
            the network drops.
          </p>
        </aside>
      </div>
    </section>
  );
}
