self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  if (new URL(event.request.url).origin !== location.origin) {
    return;
  }

  event.respondWith(
    caches
      .match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request)
          .then((networkResponse) => {
            return caches.open('v1').then((cache) => {
              cache.put(event.request, networkResponse.clone());
              return networkResponse;
            });
          })
          .catch(() => {
            return new Response('Network error occurred', {
              status: 408,
              statusText: 'Network error',
            });
          });
      })
      .catch(() => {
        return new Response('Cache error occurred', {
          status: 500,
          statusText: 'Cache error',
        });
      })
  );
});
