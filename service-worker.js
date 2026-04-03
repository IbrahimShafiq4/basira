/* ══════════════════════════════════════════════════════════════
   بصيرة - Service Worker
   Handles offline caching & background sync
══════════════════════════════════════════════════════════════ */

const CACHE_NAME    = 'basira-v1.0.0';
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;900&family=Cairo:wght@400;600;700;900&display=swap',
];

/* ── INSTALL: Cache all static assets ──────────────────────── */
self.addEventListener('install', event => {
  console.log('[SW] Installing…');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching static assets');
      // cache.addAll() fails if ANY asset fails — use individual adds
      return Promise.allSettled(
        STATIC_ASSETS.map(url => cache.add(url).catch(e => console.warn('[SW] Failed to cache:', url, e)))
      );
    })
  );
  self.skipWaiting(); // Activate immediately
});

/* ── ACTIVATE: Remove old caches ───────────────────────────── */
self.addEventListener('activate', event => {
  console.log('[SW] Activating…');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => { console.log('[SW] Deleting old cache:', k); return caches.delete(k); })
      )
    )
  );
  self.clients.claim(); // Take control of all pages immediately
});

/* ── FETCH: Cache-first with network fallback ───────────────── */
self.addEventListener('fetch', event => {
  // Skip non-GET requests and browser extensions
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http'))  return;

  // For Google Fonts (network-first then cache)
  if (event.request.url.includes('fonts.googleapis.com') ||
      event.request.url.includes('fonts.gstatic.com')) {
    event.respondWith(networkFirstStrategy(event.request));
    return;
  }

  // For everything else: cache-first
  event.respondWith(cacheFirstStrategy(event.request));
});

/** Cache-first: try cache, fall back to network & update cache */
async function cacheFirstStrategy(request) {
  try {
    const cached = await caches.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline fallback
    const cached = await caches.match('./index.html');
    return cached || new Response('Offline', { status: 503 });
  }
}

/** Network-first: try network, fall back to cache */
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

/* ── PUSH NOTIFICATIONS (future enhancement) ───────────────── */
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'بصيرة', {
      body:  data.body  || 'تذكير جديد',
      icon:  data.icon  || './assets/icons/icon-192.png',
      badge: './assets/icons/icon-72.png',
      dir:   'rtl',
      lang:  'ar',
      vibrate: [200, 100, 200],
      data: { url: data.url || './' },
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow('./');
    })
  );
});
