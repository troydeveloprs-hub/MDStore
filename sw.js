/* ===================================================================
   MDBoutiquee — Service Worker (PWA Offline Support)
   =================================================================== */
const CACHE_NAME = 'mdb-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/cart.html',
  '/checkout.html',
  '/product.html',
  '/css/sofie.css',
  '/js/store.js',
  '/js/app.js',
  '/js/features.js',
  '/data/products.json',
  '/manifest.json'
];

// Install — cache core assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

// Fetch — network first, fall back to cache
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
      return res;
    }).catch(() => caches.match(e.request))
  );
});
