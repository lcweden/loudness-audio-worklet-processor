import { useContext } from "solid-js";
import { EnvironmentContext } from "../contexts/environment-context";

function createEnvironment() {
  const context = useContext(EnvironmentContext);

  if (!context) {
    throw new Error("createEnvironment must be used within an EnvironmentProvider");
  }

  return context;
}

export default createEnvironment;
