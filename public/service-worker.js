const CACHE_NAME = "v1.4.2";
const REQUESTS = [
  "/loudness-audio-worklet-processor/",
  "/loudness-audio-worklet-processor/index.html",
  "/loudness-audio-worklet-processor/manifest.json"
];

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
      try {
        if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) {
          return await fetch(event.request);
        }

        const cachedResponse = await caches.match(event.request);

        if (cachedResponse) {
          return cachedResponse;
        }

        const fetchResponse = await fetch(event.request);
        const cache = await caches.open(CACHE_NAME);
        await cache.put(event.request, fetchResponse.clone());

        return fetchResponse;
      } catch (error) {
        return new Response("Offline or fetch failed", {
          status: 503,
          statusText: "Service Unavailable",
          headers: { "Content-Type": "text/plain" }
        });
      }
    })()
  );
}

self.addEventListener("install", handleInstall);
self.addEventListener("activate", handleActivate);
self.addEventListener("fetch", handleFetch);
