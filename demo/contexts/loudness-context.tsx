import { Accessor, createContext, createSignal, JSX, Setter, useContext } from "solid-js";
import { AudioLoudnessSnapshot } from "../../types";

type LoudnessProviderProps = {
  children: JSX.Element;
};

type LoudnessContextType = [
  getSnapshots: Accessor<Array<AudioLoudnessSnapshot>>,
  setSnapshots: Setter<Array<AudioLoudnessSnapshot>>
];

const LoudnessContext = createContext<LoudnessContextType>();

function createLoudnessContext() {
  const context = useContext(LoudnessContext);

  if (!context) {
    throw new Error("createLoudnessContext must be used within a LoudnessProvider");
  }

  return context;
}

function LoudnessProvider(props: LoudnessProviderProps) {
  const [getSnapshots, setSnapshots] = createSignal<Array<AudioLoudnessSnapshot>>([]);

  return <LoudnessContext.Provider value={[getSnapshots, setSnapshots]}>{props.children}</LoudnessContext.Provider>;
}

export { createLoudnessContext, LoudnessProvider };
