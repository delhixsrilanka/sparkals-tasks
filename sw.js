const CACHE_NAME = 'sparkals-tasks-v2';
const OFFLINE_URL = '/offline.html';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/logo_copfy.png',
  '/offline.html'
];

// Install — save all files to phone storage
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return Promise.allSettled(
          ASSETS_TO_CACHE.map(url =>
            cache.add(url).catch(err => {
              console.log('Could not cache:', url, err);
            })
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate — clean up any old saved versions
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('Removing old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch — serve from phone storage when no internet
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip chrome extensions and non-http requests
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Return cached version if available
        if (cachedResponse) {
          return cachedResponse;
        }

        // Try network
        return fetch(event.request)
          .then(response => {
            // Don't cache bad responses
            if (!response || response.status !== 200 || response.type === 'opaque') {
              return response;
            }

            // Save a copy to cache
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, responseToCache));

            return response;
          })
          .catch(() => {
            // No internet — show offline page for navigation
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL)
                .then(offlineResponse => {
                  return offlineResponse || new Response(
                    '<h1>Sparkals Tasks — You are offline</h1>',
                    { headers: { 'Content-Type': 'text/html' } }
                  );
                });
            }
          });
      })
  );
});

// Background sync — send saved data when internet returns
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  console.log('Sparkals Tasks: Internet returned — syncing saved data');
}

// Push notifications — receive alerts even when app is closed
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Sparkals Tasks';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icons/logo_copfy.png',
    badge: '/icons/logo_copfy.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' }
  };
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click — open correct page when staff taps alert
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
