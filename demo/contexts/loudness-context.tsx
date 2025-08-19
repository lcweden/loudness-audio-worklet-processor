import { createContext, createSignal, JSX, Signal } from "solid-js";
import { AudioLoudnessSnapshot } from "../../types";

type LoudnessProviderProps = {
  children: JSX.Element;
};

type LoudnessContextType = {
  snapshots: Signal<Array<AudioLoudnessSnapshot>>;
  isProcessing: Signal<boolean>;
  isFinished: Signal<boolean>;
  error: Signal<Error | undefined>;
};

const LoudnessContext = createContext<LoudnessContextType>();

function LoudnessProvider(props: LoudnessProviderProps): JSX.Element {
  const [getSnapshots, setSnapshots] = createSignal<Array<AudioLoudnessSnapshot>>([], { equals: false });
  const [getIsProcessing, setIsProcessing] = createSignal<boolean>(false);
  const [getIsFinished, setIsFinished] = createSignal<boolean>(false);
  const [getError, setError] = createSignal<Error>();

  return (
    <LoudnessContext.Provider
      value={{
        snapshots: [getSnapshots, setSnapshots],
        isProcessing: [getIsProcessing, setIsProcessing],
        isFinished: [getIsFinished, setIsFinished],
        error: [getError, setError]
      }}
    >
      {props.children}
    </LoudnessContext.Provider>
  );
}

export { LoudnessContext, LoudnessProvider };
