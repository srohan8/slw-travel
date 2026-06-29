// By Sloth — Service Worker
// Cache-first for app shell; network-only for Supabase, Reddit, geocoding APIs.

const CACHE_NAME = 'slw-v4';
const SHELL_URLS = [
  '/app/',
  '/auth.html',
  '/icons/icon.svg',
];

// ── Install: pre-cache the app shell ─────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_URLS))
  );
  self.skipWaiting(); // activate immediately
});

// ── Activate: clean up old caches ────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim(); // take control of open tabs immediately
});

// ── Fetch strategy ────────────────────────────────────────────────
// External APIs (Supabase, Reddit, Nominatim, OSRM, etc.) → network only
// Same-origin assets → cache-first with network fallback

const NETWORK_ONLY_ORIGINS = [
  'supabase.co',
  'reddit.com',
  'nominatim.openstreetmap.org',
  'router.project-osrm.org',
  'api.opentopodata.org',
  'eu.i.posthog.com',
  'app.minnal.io',
  'api.anthropic.com',
  'railway.app',
];

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return; // don't intercept POST/PUT/DELETE

  const url = new URL(req.url);

  // Pass through external API calls without caching
  if (
    url.origin !== self.location.origin ||
    NETWORK_ONLY_ORIGINS.some(h => url.hostname.includes(h))
  ) return;

  // Cache-first for same-origin static assets
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        // Cache successful responses for html, css, js, svg, fonts, images
        if (res.ok && /\.(html|css|js|svg|png|jpg|woff2?|ico)(\?|$)/.test(url.pathname)) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return res;
      }).catch(() => {
        // Offline fallback: return cached app shell if navigating
        if (req.mode === 'navigate') return caches.match('/app/');
        // For other requests (assets), just let the browser handle the error
        return Response.error();
      });
    })
  );
});
