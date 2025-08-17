import { createSignal, useContext } from "solid-js";
import { LoudnessContext } from "../contexts";
import LoudnessService from "../services/loudness.service";

function createLoudnessMeter() {
  const module = new URL("https://lcweden.github.io/loudness-audio-worklet-processor/loudness.worklet.js");
  const service = new LoudnessService(module);
  const context = useContext(LoudnessContext);

  if (!context) {
    throw new Error("createLoudnessContext must be used within a LoudnessProvider");
  }

  const [getSnapshots, setSnapshots] = context;
  const [getIsProcessing, setIsProcessing] = createSignal<boolean>(false);
  const [getIsFinished, setIsFinished] = createSignal<boolean>(false);
  const [getError, setError] = createSignal<Error>();

  function reset() {
    setSnapshots([]);
    setIsProcessing(false);
    setIsFinished(false);
    setError(undefined);
  }

  async function start(buffer: AudioBuffer) {
    if (getIsProcessing()) return;

    try {
      if (!buffer) {
        throw new Error("No audio buffer provided");
      }

      setIsProcessing(true);
      setIsFinished(false);
      await service.measure(buffer, (event) => {
        const snapshot = event.data;
        setSnapshots((prev) => [...prev, snapshot]);
      });
    } catch (reason) {
      setIsProcessing(false);
      setError(new Error("Failed to process audio", { cause: reason }));
    } finally {
      setIsProcessing(false);
      setIsFinished(true);
    }
  }

  return { start, reset, getIsProcessing, getIsFinished, getSnapshots, getError };
}

export default createLoudnessMeter;
