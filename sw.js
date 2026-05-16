const CACHE_NAME = 'owi-fintrack-v4'; // Ganti versi cache biar browser refresh settingan lama
const urlsToCache = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/db.js',
  './js/ui.js',
  './js/i18n.js',
  './js/utils.js',
  './assets/icons/icon-192x192.png',
  './assets/icons/logo-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching core assets & icons');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('Failed to cache:', err);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;
        return fetch(event.request);
      }
    )
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName); // Hapus cache versi lama
          }
        })
      );
    })
  );
});
