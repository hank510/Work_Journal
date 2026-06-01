// Work Journal Service Worker v2
// Handles app shell caching + weekday reminder notifications at 9 PM

const CACHE_NAME = 'work-journal-v2';
const SHELL_FILES = ['/', '/index.html'];

// ─── Install ───────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

// ─── Activate ──────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ─── Fetch ─────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('accounts.google.com') ||
    url.hostname.includes('anthropic.com')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

// ─── Notification click ────────────────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length > 0) return list[0].focus();
      return clients.openWindow('/');
    })
  );
});

// ─── Message from app: schedule or cancel reminder ────────────────────────
self.addEventListener('message', event => {
  if (event.data?.type === 'SCHEDULE_REMINDER') {
    scheduleReminder(event.data.msUntilFire);
  }
  if (event.data?.type === 'CANCEL_REMINDER') {
    if (self._reminderTimer) clearTimeout(self._reminderTimer);
  }
});

function scheduleReminder(ms) {
  if (self._reminderTimer) clearTimeout(self._reminderTimer);
  if (ms < 0) return;
  self._reminderTimer = setTimeout(() => {
    self.registration.showNotification('📓 Work Journal', {
      body: "You haven't logged today yet. Take 2 minutes to record your day!",
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'daily-reminder',
      renotify: false,
      requireInteraction: false,
      vibrate: [200, 100, 200]
    });
  }, ms);
}
