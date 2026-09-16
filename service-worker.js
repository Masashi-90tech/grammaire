// Grammaire PWA service worker
// CACHE_VERSION is injected by build.py at build time (content hash) so that
// every rebuild automatically busts old caches for users who are online,
// while users who are offline keep using whatever they already have cached.
const CACHE_VERSION = "90131f4e7b2c";
const CACHE_NAME = "grammaire-" + CACHE_VERSION;
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        // network-first: when online, always prefer the latest build;
        // this also refreshes the cache for the next offline session.
        const fresh = await fetch(event.request);
        if (fresh && fresh.ok) {
          cache.put(event.request, fresh.clone());
        }
        return fresh;
      } catch (err) {
        // offline (or network error): fall back to whatever we have cached
        const cached = await cache.match(event.request, { ignoreSearch: true });
        if (cached) return cached;
        // last resort for navigations: serve the shell
        if (event.request.mode === "navigate") {
          const shell = await cache.match("./index.html");
          if (shell) return shell;
        }
        throw err;
      }
    })()
  );
});
