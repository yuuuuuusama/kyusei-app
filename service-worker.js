// service-worker.js
// オフライン対応用

const CACHE_NAME = 'kyusei-app-v83';
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
  './js/keisha-data.js',
  './js/seigetsu-data.js',
  './js/seinichi-data.js',
  './js/seimatsuri-data.js',
  './js/kyusei-meaning-data.js',
  './js/kan-data.js',
  './js/houi-data.js',
  './js/gogyou-data.js',
  './js/nijuhasshuku-data.js',
  './js/hizu-data.js',
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

// network-first 戦略: オンライン時は最新を取得、オフライン時のみキャッシュ
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  const isStaticAsset = /\.(png|jpg|jpeg|webp|svg|ico|woff2?|ttf)$/i.test(url.pathname);
  if (isStaticAsset) {
    // 画像・フォントは cache-first
    e.respondWith(
      caches.match(e.request).then(resp => resp || fetch(e.request).then(netResp => {
        if (netResp.ok) {
          const clone = netResp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return netResp;
      }))
    );
  } else {
    // HTML/JS/CSS は network-first
    e.respondWith(
      fetch(e.request).then(netResp => {
        if (netResp.ok) {
          const clone = netResp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return netResp;
      }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
    );
  }
});
