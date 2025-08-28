import { useContext } from "solid-js";
import { LoudnessContext } from "../contexts/loudness-context";

function createLoudness() {
  const context = useContext(LoudnessContext);

  if (!context) {
    throw new Error("createLoudness must be used within a LoudnessProvider");
  }

  return context;
}

export default createLoudness;
