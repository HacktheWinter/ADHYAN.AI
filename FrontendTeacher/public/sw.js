// A basic service worker required for PWA installability in some browsers
self.addEventListener('install', (e) => {
  console.log('[Service Worker] Install');
});

self.addEventListener('fetch', (e) => {
  // Doing nothing, just letting the browser handle fetches normally.
  // This satisfies the PWA installability requirement for a fetch handler.
});
