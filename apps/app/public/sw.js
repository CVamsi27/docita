// fallow-ignore-file unused-file
/* Docita app service worker — resilient offline shell.
 *
 * Strategy:
 * - Precache the app shell (index.html + manifest) on install.
 * - Navigation requests: network-first, fall back to the cached shell,
 *   then to offline.html when completely offline.
 * - Static hashed assets: cache-first with stale-while-revalidate (they are
 *   content-addressed, so a cached copy is always correct).
 * - Never intercept /api/* or /socket.io/* — those go through the Worker.
 * - Skip caching on non-GET requests.
 */

const CACHE_NAME = "docita-shell-v1";
const OFFLINE_URL = "/offline.html";
const SHELL_URLS = ["/index.html", "/manifest.webmanifest", OFFLINE_URL];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isNavigationRequest(request) {
  return request.mode === "navigate";
}

function isApiRequest(url) {
  return url.pathname.startsWith("/api/") || url.pathname.startsWith("/socket.io/");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isApiRequest(url)) return;

  if (isNavigationRequest(request)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets (content-addressed): cache-first, update in background.
  event.respondWith(cacheFirst(request));
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put("/index.html", response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match("/index.html");
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;
    return new Response("Offline", { status: 503 });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    void refreshCache(request);
    return cached;
  }
  return fetchAndCache(request);
}

async function fetchAndCache(request) {
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}

async function refreshCache(request) {
  if (navigator.onLine === false) return;
  try {
    await fetchAndCache(request);
  } catch {
    // Offline — keep serving the cached copy.
  }
}
