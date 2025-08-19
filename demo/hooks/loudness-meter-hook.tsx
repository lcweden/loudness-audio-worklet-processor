import { useContext } from "solid-js";
import { LoudnessContext } from "../contexts";
import LoudnessService from "../services/loudness.service";

function createLoudnessMeter() {
  const module = new URL("https://lcweden.github.io/loudness-audio-worklet-processor/loudness.worklet.js");
  const service = new LoudnessService(module);
  const context = useContext(LoudnessContext);

  if (!context) {
    throw new Error("createLoudnessContext must be used within a LoudnessProvider");
  }

  const { snapshots, isProcessing, isFinished, error } = context;
  const [getSnapshots, setSnapshots] = snapshots;
  const [getIsProcessing, setIsProcessing] = isProcessing;
  const [getIsFinished, setIsFinished] = isFinished;
  const [getError, setError] = error;

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
        setSnapshots((prev) => (prev.push(snapshot), prev));
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
