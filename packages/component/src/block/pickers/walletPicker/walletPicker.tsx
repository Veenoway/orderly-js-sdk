import { Input } from "@/input";
import { FC, useContext, useMemo } from "react";
import { API, ChainConfig, CurrentChain } from "@orderly.network/types";
import { ChainSelect } from "../chainPicker";
import { OrderlyContext } from "@orderly.network/hooks";

export type Wallet = {
  // token: string;
  address: string;

  icon: string;
  label: string;
};

export interface WalletPickerProps {
  // chains?: API.ChainDetail[];

  chain: CurrentChain | null;

  address?: string;

  networkId?: "mainnet" | "testnet";
  settingChain?: boolean;

  onOpenPicker?: () => void;
  onChainChange?: (chain: any) => void;
  onChainInited?: (chain: API.Chain) => void;

  wooSwapEnabled?: boolean;
}

export const WalletPicker: FC<WalletPickerProps> = (props) => {
  const { chain } = props;

  const { onlyTestnet } = useContext<any>(OrderlyContext);

  const address = useMemo(() => {
    if (!props.address) return "--";
    return props.address.replace(/^(.{6})(.*)(.{4})$/, "$1......$3");
  }, [props.address]);

  //

  return (
    <div className={"flex gap-2"}>
      <Input className="text-4xs text-base-contrast-36" containerClassName="bg-base-500 rounded-borderRadius" disabled value={address} fullWidth />
      <ChainSelect
        value={chain}
        onValueChange={props.onChainChange}
        onChainInited={props.onChainInited}
        settingChain={props.settingChain}
        onlyTestnet={onlyTestnet}
        wooSwapEnabled={props.wooSwapEnabled}
      />
    </div>
  );
};
