// ═══════════════════════════════════════════════════════════
// SPARKALS TASKS — Firebase Messaging Service Worker
// Handles push notifications when app is closed or in background
// ═══════════════════════════════════════════════════════════

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDNwQYXcwZrAh4cTfRyhOVk_pRod9p4CRM",
  authDomain: "sparkals-tasks-app.firebaseapp.com",
  projectId: "sparkals-tasks-app",
  storageBucket: "sparkals-tasks-app.firebasestorage.app",
  messagingSenderId: "147179987231",
  appId: "1:147179987231:web:c6ffa484f33a2ca420d02a"
});

const messaging = firebase.messaging();

// ── BACKGROUND MESSAGE HANDLER ──
// This fires when a push notification arrives and the app is closed or in background
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Background message received:', payload);

  const notificationTitle = payload.notification?.title || payload.data?.title || 'Sparkals Tasks';
  const notificationOptions = {
    body:  payload.notification?.body  || payload.data?.body  || 'You have a new notification',
    icon:  '/icons/logo%20copfy.png',
    badge: '/icons/logo%20copfy.png',
    tag:   payload.data?.type || 'sparkals-notification',
    data:  payload.data || {},
    actions: [
      { action: 'open', title: '📱 Open App' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    requireInteraction: false,
    silent: false
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// ── NOTIFICATION CLICK HANDLER ──
// When staff taps the notification — opens the right page
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = 'https://sparkals-tasks.vercel.app/dashboard.html';

  // Route to correct page based on notification type
  if (data.type === 'task_assigned' || data.type === 'task_updated') {
    targetUrl = 'https://sparkals-tasks.vercel.app/tasks.html';
  } else if (data.type === 'leave_approved' || data.type === 'leave_rejected') {
    targetUrl = 'https://sparkals-tasks.vercel.app/leave.html';
  } else if (data.type === 'overdue_alert' || data.type === 'escalation') {
    targetUrl = 'https://sparkals-tasks.vercel.app/tasks.html';
  } else if (data.type === 'deadline_reminder') {
    targetUrl = 'https://sparkals-tasks.vercel.app/tasks.html';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // If app already open — focus it and navigate
      for (const client of clientList) {
        if (client.url.includes('sparkals-tasks.vercel.app') && 'focus' in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      // App not open — open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// ── PUSH EVENT FALLBACK ──
// Handles raw push events in case FCM payload comes differently
self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      const data = event.data.json();
      // FCM handles this via onBackgroundMessage above
      // This is just a safety fallback
      console.log('[SW] Push event received:', data);
    } catch(e) {
      console.log('[SW] Push event (non-JSON):', event.data.text());
    }
  }
});
