import React, {
  FC,
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";

import { ModalProvider } from "@/modal/modalContext";
import { Toaster } from "@/toast/Toaster";

import { TooltipProvider } from "@/tooltip/tooltip";
import {
  useWalletConnector,
  useSessionStorage,
  OrderlyConfigProvider,
  ConfigProviderProps,
  useAccountInstance,
} from "@orderly.network/hooks";
import toast, { useToasterStore } from "react-hot-toast";
import { LocalProvider } from "@/i18n";

export type AppStateErrors = {
  ChainNetworkNotSupport: boolean;
  IpNotSupport: boolean;
  NetworkError: boolean;
};

export type OrderlyAppContextState = {
  logoUrl: string;
  theme: any;
  onWalletConnect: () => Promise<any>;
  onWalletDisconnect: () => Promise<any>;
  onSetChain: (chainId: number) => Promise<any>;

  errors: AppStateErrors;

  //   errors?: AppStateErrors;
};

export const OrderlyAppContext = createContext<OrderlyAppContextState>(
  {} as OrderlyAppContextState
);

export interface OrderlyAppProviderProps {
  logoUrl: string;
  theme?: any;
  toastLimitCount?: number;
  onlyTestnet?: boolean;
  /**
   * are include testnet chains
   */
  includeTestnet?: boolean;
}

export const OrderlyAppProvider: FC<
  PropsWithChildren<OrderlyAppProviderProps & ConfigProviderProps>
> = (props) => {
  const {
    logoUrl,
    theme,
    configStore,
    keyStore,
    getWalletAdapter,
    brokerId,
    networkId,
    onlyTestnet,
    includeTestnet,
    toastLimitCount,
  } = props;

  return (
    <OrderlyConfigProvider
      configStore={configStore}
      keyStore={keyStore}
      getWalletAdapter={getWalletAdapter}
      brokerId={brokerId}
      networkId={networkId}
    >
      <InnerProvider
        logoUrl={logoUrl}
        theme={theme}
        onlyTestnet={onlyTestnet}
        toastLimitCount={toastLimitCount}
      >
        {props.children}
      </InnerProvider>
    </OrderlyConfigProvider>
  );
};

const InnerProvider = (props: PropsWithChildren<OrderlyAppProviderProps>) => {
  const {
    logoUrl,
    theme,

    onlyTestnet,
    toastLimitCount = 1,
  } = props;

  const { toasts } = useToasterStore();

  const {
    connect,
    disconnect,
    wallet: currentWallet,
    setChain,
    chains,
  } = useWalletConnector();

  const account = useAccountInstance();

  // const [testChains] = useChains(networkId, { wooSwapEnabled: false });

  //

  const [errors, setErrors] = useSessionStorage<AppStateErrors>("APP_ERRORS", {
    ChainNetworkNotSupport: false,
    IpNotSupport: false,
    NetworkError: false,
  });

  const checkChainId = useCallback(
    (chainId: string): boolean => {
      if (!chainId || !chains) {
        return false;
      }

      if (typeof chainId === "number") {
        chainId = `0x${Number(chainId).toString(16)}`;
      }

      //

      if (onlyTestnet && chainId !== "0x66eed") {
        return false;
      }

      const isSupport = chains.some((item: { id: string }) => {
        return item.id === chainId;
      });

      return isSupport;
    },
    [chains, onlyTestnet]
  );

  const _onWalletConnect = useCallback(async (): Promise<any> => {
    if (connect) {
      const walletState = await connect();

      if (
        Array.isArray(walletState) &&
        walletState.length > 0 &&
        walletState[0] &&
        walletState[0].accounts.length > 0
      ) {
        const wallet = walletState[0];

        ////// check chainid ///////

        if (!checkChainId(wallet.chains[0].id)) {
          return false;
        }

        //
        if (!account) {
          throw new Error("account is not initialized");
        }
        // account.address = wallet.accounts[0].address;
        const status = await account.setAddress(wallet.accounts[0].address, {
          provider: wallet.provider,
          chain: wallet.chains[0],
          wallet: {
            name: wallet.label,
          },
          // label: ,
        });

        return { wallet, status };
      }
    } else {
      throw new Error("walletProvider is required");
    }
  }, [connect, account]);

  const _onWalletDisconnect = useCallback(async (): Promise<any> => {
    if (typeof disconnect === "function" && currentWallet) {
      console.warn("🤜 disconnect wallet");

      return disconnect(currentWallet).then(() => {
        return account.disconnect();
      });
    }
  }, [disconnect, currentWallet, account]);

  const _onSetChain = useCallback((chainId: number) => {
    return setChain({ chainId }).then((success: boolean) => {
      if (success) {
        // @ts-ignore
        setErrors((errors) => ({ ...errors, ChainNetworkNotSupport: false }));
      }

      return success;
    });
  }, []);

  const currentAddress = useMemo(() => {
    if (!currentWallet) {
      return null;
    }
    return currentWallet.accounts[0].address;
  }, [currentWallet]);

  const currentChainId = useMemo(() => {
    if (!currentWallet) {
      return null;
    }
    return currentWallet.chains[0].id;
  }, [currentWallet]);

  useEffect(() => {
    // currentWallet?.provider.detectNetwork().then((x) =>

    if (!chains || chains.length === 0) {
      return;
    }

    if (
      !!currentWallet &&
      Array.isArray(currentWallet.accounts) &&
      currentWallet.accounts.length > 0 &&
      account
    ) {
      if (
        account.address === currentAddress &&
        currentChainId === account.chainId
      ) {
        return;
      }
      // 需要确定已经拿到chains list
      if (!checkChainId(currentChainId)) {
        // console.warn("!!!! not support this chian -> disconnect wallet");
        // TODO: 确定是否需要断开连接
        // account.disconnect();
        // @ts-ignore
        setErrors((errors) => ({ ...errors, ChainNetworkNotSupport: true }));

        console.warn("current chain not support!  -> disconnect wallet!!!");
        return;
      } else {
        setErrors((errors: any) => ({
          ...errors,
          ChainNetworkNotSupport: false,
        }));
      }

      account.setAddress(currentWallet.accounts[0].address, {
        provider: currentWallet.provider,
        chain: currentWallet.chains[0],
        wallet: {
          name: currentWallet.label,
        },
        // label: currentWallet.label,
      });
    }
    // }
    // }, [ready, currentWallet]);
  }, [currentAddress, currentChainId, chains, account]);

  // limit toast count
  useEffect(() => {
    toasts
      .filter((t) => t.visible) // Only consider visible toasts
      .filter((_, i) => i >= toastLimitCount) // Is toast index over limit
      .forEach((t) => toast.dismiss(t.id)); // Dismiss – Use toast.remove(t.id) removal without animation
  }, [toasts]);

  return (
    <OrderlyAppContext.Provider
      value={{
        logoUrl,
        theme,
        errors,
        onWalletConnect: _onWalletConnect,
        onWalletDisconnect: _onWalletDisconnect,
        onSetChain: _onSetChain,
      }}
    >
      <TooltipProvider>
        <LocalProvider>
          {/* <WSObserver /> */}
          <ModalProvider>{props.children}</ModalProvider>
        </LocalProvider>
      </TooltipProvider>
      <Toaster />
    </OrderlyAppContext.Provider>
  );
};
