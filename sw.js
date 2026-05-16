const CACHE_NAME = 'shadow-v1';

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './logo.jpeg',
  './icon-512.png'
];

const EXTERNAL_URLS = [
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap',
  'https://unpkg.com/lucide@latest/dist/umd/lucide.js'
];

/* Install: precache aset lokal */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

/* Activate: bersihkan cache lama */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

/* Fetch: cache first untuk lokal, network first untuk external */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  /* Skip non-GET */
  if (event.request.method !== 'GET') return;

  /* External resources: network first, fallback cache */
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  /* Lokal: cache first, fallback network */
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
  );
});