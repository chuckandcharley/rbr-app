// Ready Bag Rally — service worker
// Purpose: make the app installable (fullscreen, no browser bar) and let the
// shell load instantly / survive brief network drops. Supabase calls always
// go to the network — we never cache live count data.

// IMPORTANT: bump the cache name any time you deploy new files so tablets
// pick up changes immediately instead of serving the old cached shell.
const CACHE = 'rbr-v8';
const SHELL = [
  'index.html',
  'manifest.json',
  'RBRbag.png',
  'icon-192.png',
  'icon-512.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(SHELL.map((url) => c.add(url).catch(() => null)))
    )
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Never cache Supabase / API / fonts CDN — always hit the network.
  if (url.origin !== self.location.origin) return;
  // Shell: network-first so edits show up, falling back to cache offline.
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('index.html')))
  );
});
