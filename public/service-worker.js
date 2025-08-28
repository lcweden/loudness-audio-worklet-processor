const CACHE_NAME = "v1";
const REQUESTS = ["/"];

function handleInstall(event) {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(REQUESTS);
    })()
  );
}

function handleActivate(event) {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      for (const key of keys) {
        if (key !== CACHE_NAME) {
          await caches.delete(key);
        }
      }
    })()
  );
}

function handleFetch(event) {
  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(event.request);

      if (cachedResponse) {
        return cachedResponse;
      }

      const fetchResponse = await fetch(event.request);
      const cache = await caches.open(CACHE_NAME);
      await cache.put(event.request, fetchResponse.clone());

      return fetchResponse;
    })()
  );
}

self.addEventListener("install", handleInstall);
self.addEventListener("activate", handleActivate);
self.addEventListener("fetch", handleFetch);
