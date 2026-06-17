/**
 * Brick Service Worker — minimal, offline-capable app shell cache.
 *
 * Strategy:
 * - On install: precache the app shell (navigations will use cached HTML).
 * - On fetch:
 *   - Navigation requests: network-first with cache fallback (offline startup).
 *   - Static assets (JS/CSS/images): cache-first for speed.
 *   - Google Fonts: stale-while-revalidate.
 *   - Server functions (POST): network-only (never cache mutations).
 */

const CACHE_NAME = "brick-shell-v1";

// Static assets to precache on install (icons + manifest).
// JS/CSS bundles are cache-on-first-fetch since filenames are hashed.
const PRECACHE_URLS = [
  "/",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/favicon-32.png",
  "/apple-touch-icon.png",
];

// ─── Install ───────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
  // Activate immediately — don't wait for old tabs to close.
  self.skipWaiting();
});

// ─── Activate ──────────────────────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  // Clean up old cache versions.
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      ),
  );
  // Take control of all open tabs immediately.
  self.clients.claim();
});

// ─── Fetch ─────────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache POST requests (server functions, cloud backup, etc.)
  if (request.method !== "GET") return;

  // Google Fonts stylesheets — stale-while-revalidate
  if (url.hostname === "fonts.googleapis.com") {
    event.respondWith(staleWhileRevalidate(request, "brick-font-css"));
    return;
  }

  // Google Fonts webfont files — cache-first (immutable)
  if (url.hostname === "fonts.gstatic.com") {
    event.respondWith(cacheFirst(request, "brick-font-files"));
    return;
  }

  // Navigation (HTML pages) — network-first with cache fallback
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, CACHE_NAME));
    return;
  }

  // Static assets (JS, CSS, images) — cache-first
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, CACHE_NAME));
    return;
  }
});

// ─── Strategies ────────────────────────────────────────────────────────────

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return (
      cached || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } })
    );
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function isStaticAsset(url) {
  return /\.(js|css|png|jpg|jpeg|svg|ico|webp|woff2?|ttf|webmanifest)(\?.*)?$/i.test(url.pathname);
}
