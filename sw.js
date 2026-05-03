/**
 * SPARKALS TASKS — SERVICE WORKER v3
 * - Auto-update: staff phones silently get new version
 * - Offline: all pages work without internet
 * - Push: receives push notifications even when app is closed
 *
 * HOW AUTO-UPDATE WORKS:
 * 1. Every time staff opens the app, browser checks if sw.js changed
 * 2. If changed, new version downloads silently in background
 * 3. A subtle banner appears: "App updated — tap to refresh"
 * 4. Staff taps it → gets latest version instantly
 * 5. You never need to tell staff to update manually
 *
 * TO PUSH AN UPDATE TO ALL STAFF IN FUTURE:
 * Simply change the version number below from v3 to v4
 * and commit. All phones will auto-update within 24 hours.
 */

const CACHE_VERSION = "v4";
const CACHE_NAME = "sparkals-tasks-" + CACHE_VERSION;
const OFFLINE_URL = "/offline.html";

// All pages and assets to cache for offline use
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.json",
  "/firebase-config.js",
  "/audit.js",
  "/welcome-overlay.js",
  "/login.html",
  "/dashboard.html",
  "/admin.html",
  "/tasks.html",
  "/attendance.html",
  "/chat.html",
  "/leave.html",
  "/map.html",
  "/staff-register.html",
  "/staff-approval.html",
  "/notifications.html",
  "/reports.html",
  "/icons/logo%20copfy.png",
];

// ── INSTALL ──
// Runs when sw.js changes — downloads all pages to phone storage
self.addEventListener("install", event => {
  console.log("[SW v3] Installing...");
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return Promise.allSettled(
          ASSETS_TO_CACHE.map(url =>
            cache.add(url).catch(err => {
              console.log("[SW] Could not cache:", url, err.message);
            })
          )
        );
      })
      .then(() => {
        console.log("[SW v3] Installed and cached all pages");
        // Do NOT call skipWaiting here — wait for user confirmation
        // so staff are not interrupted mid-task
      })
  );
});

// ── ACTIVATE ──
// Removes old cached versions when new SW takes over
self.addEventListener("activate", event => {
  console.log("[SW v3] Activating...");
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME)
            .map(name => {
              console.log("[SW] Removing old cache:", name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log("[SW v3] Active — old caches cleared");
        return self.clients.claim();
      })
  );
});

// ── FETCH ──
// Serves pages from phone storage when offline
// Uses network-first for HTML pages (always get latest)
// Uses cache-first for assets (faster loading)
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  if (!event.request.url.startsWith("http")) return;

  // Skip Firebase, Google APIs — these need live network
  const url = event.request.url;
  if (
    url.includes("firebaseapp.com") ||
    url.includes("googleapis.com") ||
    url.includes("gstatic.com") ||
    url.includes("firestore.googleapis.com") ||
    url.includes("identitytoolkit") ||
    url.includes("securetoken")
  ) {
    return; // Let these go to network directly
  }

  // For HTML pages — network first, fall back to cache
  if (event.request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Save fresh copy to cache
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // No internet — serve from cache
          return caches.match(event.request)
            .then(cached => cached || caches.match(OFFLINE_URL));
        })
    );
    return;
  }

  // For all other assets — cache first, network fallback
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(event.request)
          .then(response => {
            if (!response || response.status !== 200 || response.type === "opaque") {
              return response;
            }
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            return response;
          })
          .catch(() => caches.match(OFFLINE_URL));
      })
  );
});

// ── MESSAGE HANDLER ──
// Receives messages from the app
self.addEventListener("message", event => {
  // When staff taps "Refresh" on the update banner — activate immediately
  if (event.data === "SKIP_WAITING") {
    console.log("[SW v3] Staff tapped update — activating new version");
    self.skipWaiting();
  }
});

// ── PUSH NOTIFICATIONS ──
// Receives push from Firebase Cloud Functions
// Shows notification on phone even when app is closed
self.addEventListener("push", event => {
  console.log("[SW v3] Push received");

  let data = {
    title: "Sparkals Tasks",
    body: "You have a new notification",
    icon: "/icons/logo%20copfy.png",
    badge: "/icons/logo%20copfy.png",
    url: "/dashboard.html"
  };

  try {
    const payload = event.data?.json();
    if (payload?.notification) {
      data.title = payload.notification.title || data.title;
      data.body = payload.notification.body || data.body;
    }
    if (payload?.data?.click_action) {
      data.url = payload.data.click_action;
    }
  } catch (e) {
    try {
      data.body = event.data?.text() || data.body;
    } catch (e2) {}
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      vibrate: [200, 100, 200],
      data: { url: data.url },
      actions: [
        { action: "open", title: "Open App" },
        { action: "dismiss", title: "Dismiss" }
      ],
      requireInteraction: false,
      tag: "sparkals-notif",
      renotify: true
    })
  );
});

// ── NOTIFICATION CLICK ──
// When staff taps the push notification — opens the app
self.addEventListener("notificationclick", event => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const targetUrl = event.notification.data?.url || "https://sparkals-tasks.vercel.app/dashboard.html";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true })
      .then(clientList => {
        // If app is already open — focus it
        for (const client of clientList) {
          if (client.url.includes("sparkals-tasks") && "focus" in client) {
            client.focus();
            client.navigate(targetUrl);
            return;
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
