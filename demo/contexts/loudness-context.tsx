import { Accessor, createContext, createEffect, createMemo, createSignal, JSX, on, Setter } from "solid-js";
import { AudioLoudnessSnapshot } from "../../types";
import { createEnvironment } from "../hooks";
import { LoudnessService } from "../services";

type LoudnessContextType = {
  start: () => Promise<void>;
  reset: () => void;
  getMode: Accessor<"FILE" | "LIVE">;
  getFile: Accessor<File | null>;
  getAudioBuffer: Accessor<AudioBuffer | null>;
  getIsProcessing: Accessor<boolean>;
  getIsFinished: Accessor<boolean>;
  getSnapshots: Accessor<Array<AudioLoudnessSnapshot>>;
  getSnapshot: Accessor<AudioLoudnessSnapshot | undefined>;
  getError: Accessor<Error | null>;
  setFile: Setter<File | null>;
};

type LoudnessProviderProps = {
  children: JSX.Element;
};

const LoudnessContext = createContext<LoudnessContextType | null>(null);

function LoudnessProvider(props: LoudnessProviderProps) {
  const { dev } = createEnvironment();
  const [getMode] = createSignal<"FILE" | "LIVE">("FILE");
  const [getFile, setFile] = createSignal<File | null>(null);
  const [getAudioBuffer, setAudioBuffer] = createSignal<AudioBuffer | null>(null);
  const [getIsProcessing, setIsProcessing] = createSignal<boolean>(false);
  const [getIsFinished, setIsFinished] = createSignal<boolean>(false);
  const [getSnapshots, setSnapshots] = createSignal<Array<AudioLoudnessSnapshot>>([]);
  const [getError, setError] = createSignal<Error | null>(null);
  const getSnapshot = createMemo(() => getSnapshots().at(-1));

  const local = new URL("../../src/index.ts", import.meta.url);
  const remote = new URL("https://lcweden.github.io/loudness-audio-worklet-processor/loudness.worklet.js");
  const service = new LoudnessService(dev ? local : remote);
  const context = new AudioContext();

  function reset() {
    setSnapshots([]);
    setIsProcessing(false);
    setIsFinished(false);
    setError(null);
  }

  async function start() {
    if (getIsProcessing()) return;

    reset();

    setIsProcessing(true);
    setIsFinished(false);
    setError(null);

    try {
      if (getMode() === "FILE") {
        const buffer = getAudioBuffer();
        if (!buffer) throw new Error("No audio buffer available");

        await service.measure(buffer, (event) => {
          const snapshot = event.data as AudioLoudnessSnapshot;
          setSnapshots((prev) => [...prev, snapshot]);
        });
        setIsFinished(true);
      }
    } catch (reason) {
      setError(new Error("Failed to process audio", { cause: reason }));
      setIsFinished(true);
    } finally {
      setIsProcessing(false);
    }
  }

  createEffect(
    on(getFile, async (file) => {
      if (file) {
        const arrayBuffer = await file!.arrayBuffer();
        const audioBuffer = await context.decodeAudioData(arrayBuffer);
        setAudioBuffer(audioBuffer);
        reset();
      }
    })
  );

  return (
    <LoudnessContext.Provider
      value={{
        start,
        reset,
        getMode,
        getFile,
        getAudioBuffer,
        getIsProcessing,
        getIsFinished,
        getSnapshots,
        getSnapshot,
        getError,
        setFile
      }}
    >
      {props.children}
    </LoudnessContext.Provider>
  );
}

export { LoudnessContext, LoudnessProvider };
