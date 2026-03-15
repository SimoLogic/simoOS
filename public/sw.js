import { skipWaiting, clientsClaim } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, NetworkFirst } from 'workbox-strategies';

// Skip waiting and claim clients immediately
skipWaiting();
clientsClaim();

// Precache statically generated assets (will be injected by build process in real scenario)
// For now, we manually handle some routes
precacheAndRoute(self.__WB_MANIFEST || []);

// Cache API requests for tasks (NetworkFirst to ensure fresh data when online)
registerRoute(
  ({ url }) => url.pathname.includes('/api/pmo/tasks'),
  new NetworkFirst({
    cacheName: 'pmo-tasks-cache',
  })
);

// Cache UI assets
registerRoute(
  ({ request }) => request.destination === 'style' || request.destination === 'script' || request.destination === 'worker',
  new StaleWhileRevalidate({
    cacheName: 'pmo-assets-cache',
  })
);

// Generic offline fallback
self.addEventListener('fetch', (event) => {
  // We can add custom offline logic here if needed
});
