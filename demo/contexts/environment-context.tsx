import { createContext, JSX } from "solid-js";

type EnvironmentContextType = {
  base: string;
  mode: string;
  isDev: boolean;
  isProd: boolean;
};

type EnvironmentProviderProps = {
  children: JSX.Element;
};

const EnvironmentContext = createContext<EnvironmentContextType | null>(null);

function EnvironmentProvider(props: EnvironmentProviderProps) {
  const base = import.meta.env.BASE_URL;
  const mode = import.meta.env.MODE;
  const isDev = import.meta.env.DEV;
  const isProd = import.meta.env.PROD;

  return (
    <EnvironmentContext.Provider value={{ base, mode, isDev, isProd }}>{props.children}</EnvironmentContext.Provider>
  );
}

export { EnvironmentContext, EnvironmentProvider };
