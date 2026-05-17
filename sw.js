const CACHE_NAME = 'owi-fintrack-final'; // GANTI JADI v6
const urlsToCache = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js', // Ini nggak pakai ?v=2 ya di SW, biar dia nge-cache nama file aslinya
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
        console.log('Caching core assets v6');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.error('Failed to cache:', err))
  );
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName); // Hapus cache v5 lama
          }
        })
      );
    })
  );
  self.clients.claim();
});
