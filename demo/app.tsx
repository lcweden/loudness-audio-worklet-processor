import { onMount } from "solid-js";

function App() {
  onMount(() => {
    const isDevMode = import.meta.env.MODE === "development";
    const isServiceWorkerSupported = "serviceWorker" in navigator;

    if (isDevMode || !isServiceWorkerSupported) return;

    const serviceWorkerURL = new URL("./service-worker.ts", import.meta.url);
    const serviceWorkerOptions = { type: "module" as WorkerType, scope: "/loudness-audio-worklet-processor/" };
    navigator.serviceWorker.register(serviceWorkerURL, serviceWorkerOptions);
  });

  return <div>App</div>;
}

export { App };
