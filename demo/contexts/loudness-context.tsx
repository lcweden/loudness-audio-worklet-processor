import { Accessor, createContext, createSignal, JSX } from "solid-js";
import { AudioLoudnessSnapshot } from "../../types";
import { createEnvironment } from "../hooks";
import { LoudnessService } from "../services";

type LoudnessContextType = {
  start: (buffer: AudioBuffer) => Promise<void>;
  reset: () => void;
  getSnapshots: Accessor<Array<AudioLoudnessSnapshot>>;
  getIsProcessing: Accessor<boolean>;
  getIsFinished: Accessor<boolean>;
  getError: Accessor<Error | undefined>;
};

type LoudnessProviderProps = {
  children: JSX.Element;
};

const LoudnessContext = createContext<LoudnessContextType | null>(null);

function LoudnessProvider(props: LoudnessProviderProps) {
  const { dev } = createEnvironment();
  const [getSnapshots, setSnapshots] = createSignal<Array<AudioLoudnessSnapshot>>([], { equals: false });
  const [getIsProcessing, setIsProcessing] = createSignal(false);
  const [getIsFinished, setIsFinished] = createSignal(false);
  const [getError, setError] = createSignal<Error>();

  const local = new URL("../../src/index.ts", import.meta.url);
  const remote = new URL("https://lcweden.github.io/loudness-audio-worklet-processor/loudness.worklet.js");
  const service = new LoudnessService(dev ? local : remote);

  function reset() {
    setSnapshots([]);
    setIsProcessing(false);
    setIsFinished(false);
    setError(undefined);
  }

  async function start(buffer: AudioBuffer) {
    if (getIsProcessing()) return;
    if (!buffer) {
      setError(new Error("No audio buffer provided"));
      return;
    }

    setIsProcessing(true);
    setIsFinished(false);
    setError(undefined);

    try {
      await service.measure(buffer, (event) => {
        const snapshot = event.data as AudioLoudnessSnapshot;
        setSnapshots((prev) => [...prev, snapshot]);
      });
      setIsFinished(true);
    } catch (reason) {
      setError(new Error("Failed to process audio", { cause: reason }));
      setIsFinished(true);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <LoudnessContext.Provider
      value={{
        start,
        reset,
        getSnapshots,
        getIsProcessing,
        getIsFinished,
        getError
      }}
    >
      {props.children}
    </LoudnessContext.Provider>
  );
}

export { LoudnessContext, LoudnessProvider };
