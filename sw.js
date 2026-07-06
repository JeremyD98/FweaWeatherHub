const CACHE = 'fwea-hub-v1';
const SHELL = ['./', './index.html', './icon.svg', './manifest.json'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const sameOrigin = url.origin === location.origin;

  if (sameOrigin) {
    // App shell: cache-first, fall back to network
    event.respondWith(
      caches.match(event.request).then(cached =>
        cached || fetch(event.request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(cache => cache.put(event.request, clone));
          }
          return res;
        })
      )
    );
    return;
  }

  // Cross-origin (weather API, map tiles, fonts): network-first, fall back to cache
  event.respondWith(
    fetch(event.request).then(res => {
      if (res.ok) {
        const clone = res.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, clone));
      }
      return res;
    }).catch(() => caches.match(event.request))
  );
});
