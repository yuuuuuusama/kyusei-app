// service-worker.js
// オフライン対応用

const CACHE_NAME = 'kyusei-app-v59';
const ASSETS = [
  './',
  './index.html',
  './handan.html',
  './history.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/solar-terms.js',
  './js/eto.js',
  './js/kyusei.js',
  './js/kantei.js',
  './js/storage.js',
  './js/dt-picker.js',
  './js/eto-table.js',
  './js/app.js',
  './js/handan.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).catch(err => console.warn('cache add failed', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(resp =>
      resp || fetch(e.request).then(netResp => {
        if (e.request.method === 'GET' && netResp.ok && new URL(e.request.url).origin === location.origin) {
          const clone = netResp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return netResp;
      }).catch(() => caches.match('./index.html'))
    )
  );
});
