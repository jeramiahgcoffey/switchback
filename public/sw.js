/* Switchback Offline Field Mode service worker. No map tiles or API payloads. */
const CACHE_VERSION = "v1";
const SHELL_CACHE = `switchback-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `switchback-runtime-${CACHE_VERSION}`;
const FIELD_CACHE = `switchback-field-${CACHE_VERSION}`;
const OWNED_CACHE_PREFIX = "switchback-";
const OFFLINE_URL = "/offline";
const SHELL_URLS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icons/switchback-192.png",
  "/icons/switchback-512.png",
];
const FIELD_PATH_PATTERN = /^\/(?:plan|plan\/packet\/[^/?#]+|share\/[^/?#]+|trails\/[^/?#]+|offline)$/;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith(OWNED_CACHE_PREFIX) &&
                ![SHELL_CACHE, RUNTIME_CACHE, FIELD_CACHE].includes(key),
            )
            .map((key) => caches.delete(key)),
        ),
      ),
      self.clients.claim(),
    ]),
  );
});

function sameOriginPath(value) {
  try {
    const url = new URL(value, self.location.origin);
    if (url.origin !== self.location.origin || !FIELD_PATH_PATTERN.test(url.pathname)) {
      return null;
    }
    return url.pathname;
  } catch {
    return null;
  }
}

async function cacheDocumentWithAssets(path) {
  const cache = await caches.open(FIELD_CACHE);
  const request = new Request(path, { credentials: "same-origin", cache: "reload" });
  const response = await fetch(request);
  if (!response.ok) throw new Error(`Unable to cache ${path}`);
  await cache.put(path, response.clone());

  const html = await response.text();
  const assetPaths = new Set(
    Array.from(
      html.matchAll(/(?:src|href)=["'](\/(?:_next\/static|images\/)[^"']+)["']/g),
      (match) => match[1].replaceAll("&amp;", "&"),
    ),
  );
  await Promise.allSettled(
    Array.from(assetPaths, async (assetPath) => {
      const assetResponse = await fetch(assetPath, { cache: "reload" });
      if (assetResponse.ok) await cache.put(assetPath, assetResponse);
    }),
  );
}

async function handleMessage(request) {
  const paths = Array.isArray(request?.paths)
    ? request.paths.slice(0, 8).map(sameOriginPath).filter(Boolean)
    : [];
  if (!paths.length) return { ok: false, error: "No valid field-kit paths." };

  if (request.action === "CACHE_FIELD_KIT") {
    await Promise.all(paths.map(cacheDocumentWithAssets));
    return { ok: true, cached: true };
  }
  if (request.action === "DELETE_FIELD_KIT") {
    const cache = await caches.open(FIELD_CACHE);
    await Promise.all(paths.map((path) => cache.delete(path)));
    return { ok: true, cached: false };
  }
  if (request.action === "STATUS_FIELD_KIT") {
    const cache = await caches.open(FIELD_CACHE);
    const cached = await cache.match(paths[0]);
    return { ok: true, cached: Boolean(cached) };
  }
  return { ok: false, error: "Unsupported offline action." };
}

self.addEventListener("message", (event) => {
  if (!event.ports?.[0]) return;
  event.waitUntil(
    handleMessage(event.data)
      .then((response) => event.ports[0].postMessage(response))
      .catch(() =>
        event.ports[0].postMessage({
          ok: false,
          error: "The field kit could not be updated.",
        }),
      ),
  );
});

async function fieldNavigation(request) {
  const cache = await caches.open(FIELD_CACHE);
  const cached = await cache.match(request);
  try {
    const response = await fetch(request);
    if (response.ok && cached) await cache.put(request, response.clone());
    return response;
  } catch {
    return cached || (await caches.match(OFFLINE_URL));
  }
}

async function publicNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (await caches.match(request)) || (await caches.match(OFFLINE_URL));
  }
}

async function staticAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(RUNTIME_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      FIELD_PATH_PATTERN.test(url.pathname)
        ? fieldNavigation(request)
        : publicNavigation(request),
    );
    return;
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/images/") ||
    url.pathname.startsWith("/icons/") ||
    ["style", "script", "font", "image"].includes(request.destination)
  ) {
    event.respondWith(staticAsset(request));
  }
});
