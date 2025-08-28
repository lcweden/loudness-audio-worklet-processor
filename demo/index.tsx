import { render } from "solid-js/web";
import { App } from "./app";
import { EnvironmentProvider, LoudnessProvider } from "./contexts";
import "./index.css";

render(
  () => (
    <EnvironmentProvider>
      <LoudnessProvider>
        <App />
      </LoudnessProvider>
    </EnvironmentProvider>
  ),
  document.getElementById("app")!
);
