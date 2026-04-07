// service-worker.js — GaN Motor AI Platform PWA
const CACHE_NAME = 'gan-motor-ai-v1';

// CDN resources to pre-cache on install (Cache-First: versioned URLs)
const CDN_RESOURCES = [
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/hammerjs@2.0.8/hammer.min.js',
  'https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom@2.0.1/dist/chartjs-plugin-zoom.min.js'
];

// Local app shell
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// ---- Install: pre-cache app shell and CDN resources ----
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // CDN: best-effort (failure is non-fatal)
      const cdnPromises = CDN_RESOURCES.map(url =>
        cache.add(url).catch(err => console.warn('[SW] CDN pre-cache failed:', url, err))
      );
      return Promise.all([cache.addAll(APP_SHELL), ...cdnPromises]);
    })
  );
  self.skipWaiting();
});

// ---- Activate: clean up old caches ----
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ---- Fetch: route requests by strategy ----
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Only intercept GET over http(s)
  if (event.request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // CDN resources: Cache-First
  if (
    url.hostname.includes('cdn.jsdelivr.net') ||
    url.hostname.includes('cdn.tailwindcss.com')
  ) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(res => {
          if (res && res.status === 200) {
            caches.open(CACHE_NAME).then(c => c.put(event.request, res.clone()));
          }
          return res;
        });
      })
    );
    return;
  }

  // HTML (root / .html): Network-First with offline fallback
  if (url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          if (res && res.status === 200) {
            caches.open(CACHE_NAME).then(c => c.put(event.request, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Everything else (icons, manifest, etc.): Cache-First
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (res && res.status === 200) {
          caches.open(CACHE_NAME).then(c => c.put(event.request, res.clone()));
        }
        return res;
      });
    })
  );
});
