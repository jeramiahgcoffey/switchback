/** Shared plumbing: HTTP with retry, response cache, naming helpers. */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const HERE = dirname(fileURLToPath(import.meta.url));
export const CACHE_DIR = join(HERE, ".cache");
export const REPO_ROOT = join(HERE, "..", "..");

export const USER_AGENT = "switchback-trail-import/0.1 (github.com/jeramiahgcoffey/switchback)";

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** GET/POST JSON with retries and backoff for flaky public endpoints. */
export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
  attempts = 4,
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: { "User-Agent": USER_AGENT, ...(init?.headers ?? {}) },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).host}`);
      return (await res.json()) as T;
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await sleep(1500 * (i + 1));
    }
  }
  throw lastErr;
}

/**
 * Cache a fetch's JSON body on disk keyed by a stable label + url hash.
 * `validate` guards against caching soft errors (ArcGIS returns HTTP 200
 * with an error object); invalid cached entries are refetched.
 */
export async function cachedFetchJson<T>(
  label: string,
  url: string,
  init?: RequestInit,
  refresh = false,
  validate?: (data: T) => boolean,
): Promise<T> {
  mkdirSync(CACHE_DIR, { recursive: true });
  const key = createHash("sha256").update(url + (init?.body?.toString() ?? "")).digest("hex").slice(0, 16);
  const file = join(CACHE_DIR, `${label}-${key}.json`);
  if (!refresh && existsSync(file)) {
    const cached = JSON.parse(readFileSync(file, "utf8")) as T;
    if (!validate || validate(cached)) return cached;
  }
  const data = await fetchJson<T>(url, init);
  if (validate && !validate(data)) {
    throw new Error(`Invalid response from ${new URL(url).host}: ${JSON.stringify(data).slice(0, 200)}`);
  }
  writeFileSync(file, JSON.stringify(data));
  return data;
}

/** "IMOGENE PASS" -> "Imogene Pass"; keeps small words lowercase mid-name. */
export function titleCase(raw: string): string {
  const small = new Set(["of", "the", "and", "to", "in", "at"]);
  const abbrev = new Set(["cr", "fs", "us", "nf", "blm"]);
  return raw
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => {
      const bare = w.replace(/[^a-z0-9]/g, "");
      if (abbrev.has(bare)) return w.toUpperCase();
      if (i > 0 && small.has(w)) return w;
      // Capitalize the first letter and any letter after - or (.
      return w.replace(/(^|[-(])([a-z])/g, (_, p: string, c: string) => p + c.toUpperCase());
    })
    .join(" ");
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/['.]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
