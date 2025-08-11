import { Route, Router } from "@solidjs/router";
import { onMount } from "solid-js";
import { LoudnessProvider } from "./contexts";
import { Home, Meter } from "./pages";

function App() {
  onMount(() => {
    const isDevMode = import.meta.env.DEV;
    const isServiceWorkerSupported = "serviceWorker" in navigator;

    if (isDevMode || !isServiceWorkerSupported) return;

    const serviceWorkerURL = new URL("./service-worker.ts", import.meta.url);
    const serviceWorkerOptions = { type: "module" as WorkerType, scope: "/loudness-audio-worklet-processor/" };
    navigator.serviceWorker.register(serviceWorkerURL, serviceWorkerOptions);
  });

  return (
    <LoudnessProvider>
      <Router>
        <Route path="/" component={Home} />
        <Route path="/meter" component={Meter} />
      </Router>
    </LoudnessProvider>
  );
}

export { App };
