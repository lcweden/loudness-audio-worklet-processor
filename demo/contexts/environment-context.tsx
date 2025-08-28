import { createContext, JSX } from "solid-js";

type EnvironmentContextType = {
  base: string;
  mode: string;
  dev: boolean;
  prod: boolean;
};

type EnvironmentProviderProps = {
  children: JSX.Element;
};

const EnvironmentContext = createContext<EnvironmentContextType | null>(null);

function EnvironmentProvider(props: EnvironmentProviderProps) {
  const base = import.meta.env.BASE_URL;
  const mode = import.meta.env.MODE;
  const dev = import.meta.env.DEV;
  const prod = import.meta.env.PROD;

  return <EnvironmentContext.Provider value={{ base, mode, dev, prod }}>{props.children}</EnvironmentContext.Provider>;
}

export { EnvironmentContext, EnvironmentProvider };
