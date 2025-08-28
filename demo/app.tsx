import { Route, Router } from "@solidjs/router";
import { lazy, onMount } from "solid-js";
import { createEnvironment } from "./hooks";

function App() {
  const { dev, base } = createEnvironment();
  const Home = lazy(() => import("./pages/home"));
  const Meter = lazy(() => import("./pages/meter"));

  onMount(() => {
    const isServiceWorkerSupported = "serviceWorker" in navigator;

    if (dev || !isServiceWorkerSupported) return;

    const serviceWorkerURL = new URL(`${base}service-worker.js`, import.meta.url);
    const serviceWorkerOptions = { type: "module" as WorkerType, scope: base };
    navigator.serviceWorker.register(serviceWorkerURL, serviceWorkerOptions);
  });

  return (
    <Router base={base.slice(0, -1)}>
      <Route path="/" component={Home} />
      <Route path="/meter" component={Meter} />
    </Router>
  );
}

export { App };
