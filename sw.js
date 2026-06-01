// Work Journal Service Worker
// Caches the app shell so it loads instantly even on slow connections.
// All data stays in Google Drive — this only caches the HTML/JS itself.

const CACHE_NAME = 'work-journal-v1';
const SHELL_FILES = [
  '/',
  '/index.html'
];

// Install: cache the app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: serve shell from cache, everything else from network
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always go to network for Google APIs (Drive, Gmail, OAuth, Claude)
  if (
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('accounts.google.com') ||
    url.hostname.includes('anthropic.com')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // For the app shell: cache-first, fallback to network
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
