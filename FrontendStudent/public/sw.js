self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});


// ==========================================
// PWA Notification Shade & System Tray Handlers
// ==========================================

// Handle incoming Web Push notifications (when app is in background or closed)
self.addEventListener('push', (event) => {
  let data = {
    title: 'ADHYAN.AI Notification',
    body: 'You have a new update in ADHYAN.AI.',
    url: '/',
  };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (err) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const title = data.title || 'ADHYAN.AI Update';
  const options = {
    body: data.body || 'New class, quiz, or announcement is available.',
    icon: data.icon || '/logo02.png',
    badge: data.badge || '/logo02.png',
    vibrate: data.vibrate || [200, 100, 200],
    tag: data.tag || 'adhyan-alert',
    renotify: true,
    data: {
      url: data.url || '/',
    },
    actions: data.actions || [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle user clicking or interacting with notification in the Notification Shade
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If there is already an open window/tab, focus it
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client && targetUrl !== '/') {
            client.navigate(targetUrl);
          }
          return;
        }
      }
      // If no window is open, launch a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Allow clients to trigger notifications through ServiceWorker postMessage if needed
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data.payload || {};
    self.registration.showNotification(title || 'ADHYAN.AI', options || {});
  }
});

