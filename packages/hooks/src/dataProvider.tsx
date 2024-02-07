import { PropsWithChildren, createContext, useContext, useRef } from "react";
import { usePrivateDataObserver } from "./orderly/usePrivateDataObserver";
import { usePreLoadData } from "./usePreloadData";

export type getKeyFunction = (index: number, prevData: any) => string | null;

interface DataCenterContextValue {
  // orders
  // positions
  // balances
  //
  regesterKeyHandler: (key: string, handler: getKeyFunction) => void;
}

export const DataCenterContext = createContext<DataCenterContextValue>(
  {} as any
);

export const useDataCenterContext = () => useContext(DataCenterContext);

export const DataCenterProvider = ({ children }: PropsWithChildren) => {
  /**
   *  preload the required data for the app
   *  hidden view while the required data is not ready
   */
  const { error, done } = usePreLoadData();

  const getKeyHandlerMapRef = useRef<Map<string, getKeyFunction>>(new Map());

  usePrivateDataObserver({
    getKeysMap(type) {
      return getKeyHandlerMapRef.current;
    },
  });

  if (error) {
    return <div>Data load failed</div>;
  }

  if (!done) return null;

  return (
    <DataCenterContext.Provider
      value={{
        regesterKeyHandler: (key, fun) => {
          getKeyHandlerMapRef.current.set(key, fun);
        },
      }}
    >
      {children}
    </DataCenterContext.Provider>
  );
};
