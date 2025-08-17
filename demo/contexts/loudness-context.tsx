import { createContext, createSignal, JSX, Signal } from "solid-js";
import { AudioLoudnessSnapshot } from "../../types";

type LoudnessProviderProps = {
  children: JSX.Element;
};

type LoudnessContextType = Signal<Array<AudioLoudnessSnapshot>>;

const LoudnessContext = createContext<LoudnessContextType>();

function LoudnessProvider(props: LoudnessProviderProps): JSX.Element {
  const [getSnapshots, setSnapshots] = createSignal<Array<AudioLoudnessSnapshot>>([]);

  return <LoudnessContext.Provider value={[getSnapshots, setSnapshots]}>{props.children}</LoudnessContext.Provider>;
}

export { LoudnessContext, LoudnessProvider };
