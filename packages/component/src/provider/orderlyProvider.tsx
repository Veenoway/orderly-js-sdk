import React, {
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  OrderlyProvider as Provider,
  SWRConfig,
  type WebSocketAdpater,
} from "@orderly.network/hooks";
import { ModalProvider } from "@/modal/modalContext";
import { Toaster } from "@/toast/Toaster";
import {
  IContract,
  type ConfigStore,
  type OrderlyKeyStore,
  type WalletAdapter,
  getWalletAdapterFunc,
} from "@orderly.network/core";
import { Account, SimpleDI } from "@orderly.network/core";
import { TooltipProvider } from "@/tooltip/tooltip";
import { WalletConnectorContext } from "./walletConnectorProvider";
import { WSObserver } from "@/dev/wsObserver";
import { useChains, useSessionStorage } from "@orderly.network/hooks";
import { API } from "@orderly.network/types";
import { PreDataLoader } from "@/system/preDataLoader";
import toast, { useToasterStore } from "react-hot-toast";

interface OrderlyProviderProps {
  ws?: WebSocketAdpater;
  networkId?: string;
  brokerId?: string;
  configStore: ConfigStore;
  keyStore: OrderlyKeyStore;
  contractManager: IContract;
  // walletAdapter: { new (options: any): WalletAdapter };
  getWalletAdapter: getWalletAdapterFunc;

  logoUrl?: string;

  toastLimitCount?: number;

  // onWalletConnect?: () => Promise<any>;
}

export const OrderlyProvider: FC<PropsWithChildren<OrderlyProviderProps>> = (
  props
) => {
  const {
    networkId = "testnet",
    logoUrl,
    keyStore,
    brokerId,
    configStore,
    contractManager,
    getWalletAdapter,
    toastLimitCount = 1,
    // onWalletConnect,
  } = props;

  if (!configStore) {
    throw new Error("configStore is required");
  }
  // const [ready, setReady] = useSessionStorage<boolean>("APP_READY", false);
  const { toasts } = useToasterStore();

  const {
    connect,
    disconnect,
    wallet: currentWallet,
    setChain,
    chains,
  } = useContext(WalletConnectorContext);

  // const [testChains] = useChains(networkId, { wooSwapEnabled: false });

  // console.log("testChains", testChains);

  const [errors, setErrors] = useSessionStorage("APP_ERRORS", {
    ChainNetworkNotSupport: false,
    IpNotSupport: false,
    NetworkError: false,
  });

  useEffect(() => {
    let account = SimpleDI.get<Account>(Account.instanceName);

    if (!account) {
      account = new Account(
        configStore,
        keyStore,
        contractManager,
        getWalletAdapter
      );

      SimpleDI.registerByName(Account.instanceName, account);
    }
  }, []);

  const apiBaseUrl = useMemo<string>(() => {
    return configStore.get("apiBaseUrl");
  }, [configStore]);
  const klineDataUrl = useMemo<string>(() => {
    return configStore.get("klineDataUrl");
  }, [configStore]);

  const checkChainId = useCallback(
    (chainId: string): boolean => {
      if (!chainId || !chains) {
        return false;
      }

      const onlyTestnet = configStore.get("onlyTestnet");

      if (typeof chainId === "number") {
        chainId = `0x${Number(chainId).toString(16)}`;
      }

      // console.log("checkChainId", chainId, chains, onlyTestnet);

      if (onlyTestnet && chainId !== "0x66eed") {
        return false;
      }

      const isSupport = chains.some((item: { id: string }) => {
        return item.id === chainId;
      });

      return isSupport;
    },
    [chains, configStore]
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

        let account = SimpleDI.get<Account>(Account.instanceName);
        // console.log("wallet", wallet, account);
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
  }, [connect]);

  console.log("current wallet", currentWallet);

  const _onWalletDisconnect = useCallback(async (): Promise<any> => {
    if (typeof disconnect === "function" && currentWallet) {
      console.warn("🤜 disconnect wallet");
      let account = SimpleDI.get<Account>(Account.instanceName);

      return disconnect(currentWallet).then(() => {
        return account.disconnect();
      });
    }
  }, [disconnect, currentWallet]);

  const _onSetChain = useCallback((chainId: number) => {
    return setChain({ chainId }).then((success: boolean) => {
      // console.log("setChain result::::", result);
      if (success) {
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
    // currentWallet?.provider.detectNetwork().then((x) => console.log(x));

    if (!chains || chains.length === 0) {
      return;
    }
    // if (ready) {
    let account = SimpleDI.get<Account>(Account.instanceName);
    // console.log("currentWallet==== auto =>>>>>>>>>>", currentWallet, account);

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
  }, [currentAddress, currentChainId, chains]);

  // limit toast count
  useEffect(() => {
    toasts
      .filter((t) => t.visible) // Only consider visible toasts
      .filter((_, i) => i >= toastLimitCount) // Is toast index over limit
      .forEach((t) => toast.dismiss(t.id)); // Dismiss – Use toast.remove(t.id) removal without animation
  }, [toasts]);

  return (
    <Provider
      value={{
        apiBaseUrl,
        klineDataUrl,
        configStore: props.configStore,
        logoUrl,
        keyStore,
        getWalletAdapter,
        contractManager: props.contractManager,
        networkId,
        // ready,
        onWalletConnect: _onWalletConnect,
        onWalletDisconnect: _onWalletDisconnect,
        onSetChain: _onSetChain,
        // onAppTestChange,
        errors,
        brokerId,
        onlyTestnet: configStore.get("onlyTestnet"),
      }}
    >
      {/* <PreDataLoader /> */}
      <TooltipProvider>
        <WSObserver />
        <ModalProvider>{props.children}</ModalProvider>
      </TooltipProvider>
      <Toaster />
    </Provider>
  );
};
